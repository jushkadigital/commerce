import { sign } from "jsonwebtoken"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createPaymentCollectionForCartWorkflow,
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Cart Promotions", () => {
      let container: any
      let productModule: any
      let cartModule: any
      let paymentModule: any
      let salesChannelModule: any
      let regionModule: any
      let query: any

      let salesChannel: any
      let region: any
      let product: any
      let variant: any
      let adminHeaders: Record<string, string>
      let storeHeaders: Record<string, string>
      let promotionIds: string[] = []

      const baseItemPrice = 100
      const baseItemQuantity = 2

      beforeAll(async () => {
        container = getContainer()
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        paymentModule = container.resolve(Modules.PAYMENT)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        adminHeaders = await createAdminUser()

        salesChannel = await salesChannelModule.createSalesChannels({
          name: `Cart Promotions ${Date.now()}`,
        })

        region = await regionModule.createRegions({
          name: `Cart Promotions ${Date.now()}`,
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        })

        product = await productModule.createProducts({
          title: "Cart Promotion Regression Product",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Size", values: ["Default"] }],
        })

        variant = await productModule.createProductVariants({
          product_id: product.id,
          title: "Default",
          sku: `CART-PROMO-${Date.now()}`,
          prices: [{ currency_code: "usd", amount: baseItemPrice }],
          options: { Size: "Default" },
          manage_inventory: false,
          allow_backorder: true,
        })

        const { result: apiKeys } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `cart-promotions-store-${Date.now()}`,
                type: "publishable",
                created_by: "integration-test",
              },
            ],
          },
        })

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: apiKeys[0].id,
            add: [salesChannel.id],
          },
        })

        storeHeaders = {
          "x-publishable-api-key": apiKeys[0].token,
        }
      })

      afterEach(async () => {
        try {
          for (const promotionId of promotionIds) {
            await api.delete(`/admin/promotions/${promotionId}`, {
              headers: adminHeaders,
            })
          }

          await productModule.deleteProductVariants(variant.id)
          await productModule.deleteProducts(product.id)
          await regionModule.deleteRegions(region.id)
          await salesChannelModule.deleteSalesChannels(salesChannel.id)
        } catch (error) {
          console.error("Cleanup error:", error)
        }

        promotionIds = []
      })

      async function createAdminUser() {
        const email = `admin-${Date.now()}@medusa-test.com`
        const userModule = container.resolve(Modules.USER)
        const authModule = container.resolve(Modules.AUTH)

        const user = await userModule.createUsers({
          email,
          first_name: "Cart",
          last_name: "Promotions",
        })

        const authIdentity = await authModule.createAuthIdentities({
          provider_identities: [
            {
              provider: "emailpass",
              entity_id: email,
              provider_metadata: {
                password: "supersecret",
              },
            },
          ],
          app_metadata: {
            user_id: user.id,
          },
        })

        const token = sign(
          {
            actor_id: user.id,
            actor_type: "user",
            auth_identity_id: authIdentity.id,
          },
          process.env.JWT_SECRET || "supersecret",
          {
            expiresIn: "1d",
          }
        )

        return {
          authorization: `Bearer ${token}`,
        }
      }

      async function createCart() {
        const cart = await cartModule.createCarts({
          email: `cart-${Date.now()}@medusa-test.com`,
          currency_code: "usd",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
        })

        await cartModule.addLineItems(cart.id, [
          {
            variant_id: variant.id,
            quantity: baseItemQuantity,
            unit_price: baseItemPrice,
            title: "Cart Promotion Item",
          },
        ])

        return cart
      }

      async function createPromotion(code: string, type: "percentage" | "fixed") {
        const response = await api.post(
          "/admin/promotions",
          {
            code,
            type: "standard",
            status: "active",
            application_method: {
              type,
              target_type: "order",
              value: type === "percentage" ? 10 : 15,
              ...(type === "fixed" ? { currency_code: "usd" } : {}),
            },
          },
          {
            headers: adminHeaders,
          }
        )

        expect([200, 201]).toContain(response.status)

        const promotion = response.data.promotion ?? response.data.promotions?.[0]

        expect(promotion).toBeDefined()
        expect(promotion.code).toBe(code)
        expect(promotion.type).toBe("standard")
        expect(promotion.application_method.type).toBe(type)
        expect(promotion.application_method.target_type).toBe("order")

        promotionIds.push(promotion.id)

        return promotion
      }

      async function retrieveCart(cartId: string): Promise<any> {
        const { data } = await query.graph({
          entity: "cart",
          fields: [
            "id",
            "promotions.id",
            "promotions.code",
            "promotions.is_automatic",
            "discount_total",
            "total",
            "payment_collection.id",
            "payment_collection.payment_sessions.id",
          ],
          filters: { id: cartId },
        })

        return data[0]
      }

      async function createPaymentSessionForCart(cartId: string) {
        await createPaymentCollectionForCartWorkflow(container).run({
          input: { cart_id: cartId },
        })

        const cart = await retrieveCart(cartId)

        await paymentModule.createPaymentSession(cart.payment_collection.id, {
          provider_id: "pp_system_default",
          currency_code: "usd",
          amount: cart.total,
          data: {},
        })

        return retrieveCart(cartId)
      }

      async function captureErrorResponse(request: Promise<unknown>) {
        try {
          await request
        } catch (error: any) {
          return error.response
        }

        throw new Error("Expected request to fail")
      }

      it("creates standard order-level promotions via the admin API", async () => {
        const percentagePromotion = await createPromotion("WELCOME10", "percentage")
        const fixedPromotion = await createPromotion("WELCOME10FIXED", "fixed")

        expect(percentagePromotion.application_method.value).toBe(10)
        expect(fixedPromotion.application_method.value).toBe(15)
        expect(fixedPromotion.application_method.currency_code).toBe("usd")
      })

      it("applies and removes an order-level percentage coupon via the store API", async () => {
        await createPromotion("WELCOME10", "percentage")
        const cart = await createCart()

        const applyResponse = await api.post(
          `/store/carts/${cart.id}/promotions`,
          { promo_codes: ["WELCOME10"] },
          { headers: storeHeaders }
        )

        expect(applyResponse.status).toBe(200)
        expect(applyResponse.data.cart.promotions).toHaveLength(1)
        expect(applyResponse.data.cart.promotions[0].code).toBe("WELCOME10")
        expect(applyResponse.data.cart.discount_total).toBe(20)
        expect(applyResponse.data.cart.total).toBe(180)

        const persistedAppliedCart = await retrieveCart(cart.id)
        expect(persistedAppliedCart.promotions ?? []).toHaveLength(1)
        expect(persistedAppliedCart.promotions?.[0].code).toBe("WELCOME10")

        const removeResponse = await api.delete(`/store/carts/${cart.id}/promotions`, {
          data: { promo_codes: ["WELCOME10"] },
          headers: storeHeaders,
        })

        expect(removeResponse.status).toBe(200)
        expect(removeResponse.data.cart.promotions).toHaveLength(0)
        expect(removeResponse.data.cart.discount_total).toBe(0)
        expect(removeResponse.data.cart.total).toBe(200)

        const persistedRemovedCart = await retrieveCart(cart.id)
        expect(persistedRemovedCart.promotions ?? []).toHaveLength(0)
      })

      it("applies a fixed order-level coupon via the store API", async () => {
        await createPromotion("WELCOME10FIXED", "fixed")
        const cart = await createCart()

        const response = await api.post(
          `/store/carts/${cart.id}/promotions`,
          { promo_codes: ["WELCOME10FIXED"] },
          { headers: storeHeaders }
        )

        expect(response.status).toBe(200)
        expect(response.data.cart.promotions).toHaveLength(1)
        expect(response.data.cart.promotions[0].code).toBe("WELCOME10FIXED")
        expect(response.data.cart.discount_total).toBe(15)
        expect(response.data.cart.total).toBe(185)
      })

      it("rejects invalid promotion codes without mutating the cart", async () => {
        const cart = await createCart()

        const response = await captureErrorResponse(
          api.post(
            `/store/carts/${cart.id}/promotions`,
            { promo_codes: ["NOTREAL"] },
            { headers: storeHeaders }
          )
        )

        expect([400, 404, 422]).toContain(response.status)
        expect(String(response.data.message).toLowerCase()).toContain("promotion")

        const persistedCart = await retrieveCart(cart.id)
        expect(persistedCart.promotions ?? []).toHaveLength(0)
        expect(Number(persistedCart.discount_total)).toBe(0)
        expect(Number(persistedCart.total)).toBe(200)
      })

      it("treats re-applying the same promotion code as idempotent", async () => {
        await createPromotion("WELCOME10", "percentage")
        const cart = await createCart()

        const firstResponse = await api.post(
          `/store/carts/${cart.id}/promotions`,
          { promo_codes: ["WELCOME10"] },
          { headers: storeHeaders }
        )

        expect(firstResponse.status).toBe(200)
        expect(firstResponse.data.cart.promotions).toHaveLength(1)
        expect(firstResponse.data.cart.discount_total).toBe(20)

        const secondResponse = await api.post(
          `/store/carts/${cart.id}/promotions`,
          { promo_codes: ["WELCOME10"] },
          { headers: storeHeaders }
        )

        expect(secondResponse.status).toBe(200)
        expect(secondResponse.data.cart.promotions).toHaveLength(1)
        expect(secondResponse.data.cart.promotions[0].code).toBe("WELCOME10")
        expect(secondResponse.data.cart.discount_total).toBe(20)
        expect(secondResponse.data.cart.total).toBe(180)

        const persistedCart = await retrieveCart(cart.id)
        expect(persistedCart.promotions ?? []).toHaveLength(1)
        expect(persistedCart.promotions?.[0].code).toBe("WELCOME10")
      })

      it("rejects applying a different second manual coupon", async () => {
        await createPromotion("WELCOME10", "percentage")
        await createPromotion("SAVE15", "fixed")
        const cart = await createCart()

        const firstResponse = await api.post(
          `/store/carts/${cart.id}/promotions`,
          { promo_codes: ["WELCOME10"] },
          { headers: storeHeaders }
        )

        expect(firstResponse.status).toBe(200)

        const response = await captureErrorResponse(
          api.post(
            `/store/carts/${cart.id}/promotions`,
            { promo_codes: ["SAVE15"] },
            { headers: storeHeaders }
          )
        )

        expect(response.status).toBe(400)
        expect(response.data.message).toBe(
          "Only one manual coupon can be applied per cart."
        )

        const persistedCart = await retrieveCart(cart.id)
        expect(persistedCart.promotions ?? []).toHaveLength(1)
        expect(persistedCart.promotions?.[0].code).toBe("WELCOME10")
      })

      it("rejects applying a coupon after payment session creation", async () => {
        await createPromotion("WELCOME10", "percentage")
        const cart = await createCart()

        const cartWithPaymentSession = await createPaymentSessionForCart(cart.id)
        expect(
          cartWithPaymentSession.payment_collection?.payment_sessions ?? []
        ).toHaveLength(1)

        const applyResponse = await captureErrorResponse(
          api.post(
            `/store/carts/${cart.id}/promotions`,
            { promo_codes: ["WELCOME10"] },
            { headers: storeHeaders }
          )
        )

        expect(applyResponse.status).toBe(409)
        expect(applyResponse.data.message).toBe(
          "Coupon changes are not allowed after payment session creation. Reset payment session and retry."
        )

        const applyPersistedCart = await retrieveCart(cart.id)
        expect(applyPersistedCart.promotions ?? []).toHaveLength(0)

      })

      it("rejects removing a coupon after payment session creation", async () => {
        await createPromotion("WELCOME10", "percentage")
        const cartWithCoupon = await createCart()

        await api.post(
          `/store/carts/${cartWithCoupon.id}/promotions`,
          { promo_codes: ["WELCOME10"] },
          { headers: storeHeaders }
        )

        const lockedCart = await createPaymentSessionForCart(cartWithCoupon.id)
        expect(lockedCart.promotions ?? []).toHaveLength(1)

        const removeResponse = await captureErrorResponse(
          api.delete(`/store/carts/${cartWithCoupon.id}/promotions`, {
            data: { promo_codes: ["WELCOME10"] },
            headers: storeHeaders,
          })
        )

        expect(removeResponse.status).toBe(409)
        expect(removeResponse.data.message).toBe(
          "Coupon changes are not allowed after payment session creation. Reset payment session and retry."
        )

        const removePersistedCart = await retrieveCart(cartWithCoupon.id)
        expect(removePersistedCart.promotions ?? []).toHaveLength(1)
        expect(removePersistedCart.promotions?.[0].code).toBe("WELCOME10")
      })
    })
  },
})
