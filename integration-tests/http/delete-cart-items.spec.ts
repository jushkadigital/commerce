import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { TOUR_MODULE, PassengerType } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Cart Items Deletion - POST /store/cart/delete-items", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let query: any
      let publishableApiKeyToken: string

      let tour: any
      let product: any
      let region: any
      let salesChannel: any
      let productVariants: any[] = []
      const testDate = "2026-05-20"

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        query = container.resolve("query")
      })

      beforeEach(async () => {
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Test Sales Channel Deletion",
        })

        region = await regionModule.createRegions({
          name: "Test Region Deletion",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        })

        product = await productModule.createProducts({
          title: "Delete Test Tour",
          description: "Tour used for deletion tests",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [
            {
              title: "Passenger Type",
              values: ["Adult", "Child"],
            },
          ],
        })

        tour = await tourModuleService.createTours({
          product_id: product.id,
          destination: "Delete Test Destination",
          description: "Full day tour",
          duration_days: 1,
          thumbnail: "https://example.com/delete-test.jpg",
          max_capacity: 50,
        })

        const passengerTypes = ["adult", "child"]
        for (const type of passengerTypes) {
          const variant = await productModule.createProductVariants({
            product_id: product.id,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Ticket`,
            sku: `DEL-${type.toUpperCase()}-001`,
            prices: [
              {
                currency_code: "usd",
                amount: type === "adult" ? 200 : 100,
              },
            ],
            options: {
              "Passenger Type": type.charAt(0).toUpperCase() + type.slice(1),
            },
            manage_inventory: false,
            allow_backorder: true,
          })

          productVariants.push(variant)

          await tourModuleService.createTourVariants({
            tour_id: tour.id,
            variant_id: variant.id,
            passenger_type: type as PassengerType,
          })
        }

        // Refresh product to get variants populated
        product = await productModule.retrieveProduct(product.id, {
          relations: ["variants"],
        })

        // Setup API Key for Store API access
        const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
          container
        ).run({
          input: {
            api_keys: [
              {
                title: `delete-test-api-${Date.now()}`,
                type: "publishable",
                created_by: "integration-test",
              },
            ],
          },
        })

        const publishableApiKey = publishableApiKeyResult[0]
        publishableApiKeyToken = publishableApiKey.token

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: publishableApiKey.id,
            add: [salesChannel.id],
          },
        })
      })

      afterEach(async () => {
        try {
          await tourModuleService.deleteTourVariants({
            tour_id: tour.id,
          })
          await tourModuleService.deleteTours(tour.id)
          for (const variant of productVariants) {
            await productModule.deleteProductVariants(variant.id)
          }
          await productModule.deleteProducts(product.id)
          await regionModule.deleteRegions(region.id)
          await salesChannelModule.deleteSalesChannels(salesChannel.id)
        } catch (error) {
          console.error("Cleanup error:", error)
        }
        productVariants = []
      })

      it("should delete specific line items from cart", async () => {
        // 1. Create a cart
        const cart = await cartModule.createCarts({
          email: "delete-items@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")
        const childVariant = product.variants.find((v: any) => v.title === "Child Ticket")

        // 2. Add multiple items directly to cart
        // We add two separate items to test deleting just one or both
        const itemsToAdd = [
          {
            variant_id: adultVariant.id,
            quantity: 2,
            unit_price: 200,
            title: "Adult Ticket Item",
            metadata: { type: "adult_test" },
          },
          {
            variant_id: childVariant.id,
            quantity: 1,
            unit_price: 100,
            title: "Child Ticket Item",
            metadata: { type: "child_test" },
          },
        ]

        await cartModule.addLineItems(cart.id, itemsToAdd)

        // Verify items added
        const { data: cartsWithItems } = await query.graph({
          entity: "cart",
          fields: ["items.id", "items.metadata"],
          filters: { id: cart.id },
        })

        const initialItems = cartsWithItems[0].items
        expect(initialItems).toHaveLength(2)

        const adultItem = initialItems.find((i: any) => i.metadata.type === "adult_test")
        const childItem = initialItems.find((i: any) => i.metadata.type === "child_test")

        expect(adultItem).toBeDefined()
        expect(childItem).toBeDefined()

        // 3. Call delete endpoint to remove ONLY the adult item
        const deleteRes = await api.post(
          "/store/cart/delete-items",
          {
            cart_id: cart.id,
            items: [adultItem.id],
          },
          {
            headers: {
              "x-publishable-api-key": publishableApiKeyToken,
            },
          }
        )

        // 4. Verify response
        expect(deleteRes.status).toBe(200)
        expect(deleteRes.data.message).toBe("Successfully deleted line items")
        expect(deleteRes.data.deleted_items).toEqual([adultItem.id])

        // Response cart should have only 1 item left
        expect(deleteRes.data.cart.items).toHaveLength(1)
        expect(deleteRes.data.cart.items[0].id).toBe(childItem.id)

        // 5. Verify database state
        const { data: finalCarts } = await query.graph({
          entity: "cart",
          fields: ["items.id"],
          filters: { id: cart.id },
        })
        expect(finalCarts[0].items).toHaveLength(1)
        expect(finalCarts[0].items[0].id).toBe(childItem.id)
      })

      it("should delete multiple line items at once", async () => {
        // 1. Create a cart
        const cart = await cartModule.createCarts({
          email: "delete-multi@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")

        // Add 3 identical items (as separate line items for test purposes if possible,
        // usually Medusa merges them if metadata is same, so we vary metadata)
        const itemsToAdd = [
          { variant_id: adultVariant.id, quantity: 1, unit_price: 200, title: "Item 1", metadata: { id: 1 } },
          { variant_id: adultVariant.id, quantity: 1, unit_price: 200, title: "Item 2", metadata: { id: 2 } },
          { variant_id: adultVariant.id, quantity: 1, unit_price: 200, title: "Item 3", metadata: { id: 3 } },
        ]

        await cartModule.addLineItems(cart.id, itemsToAdd)

        const { data: cartsWithItems } = await query.graph({
          entity: "cart",
          fields: ["items.id"],
          filters: { id: cart.id },
        })
        const itemIds = cartsWithItems[0].items.map((i: any) => i.id)
        expect(itemIds).toHaveLength(3)

        // 2. Delete the first two items
        const itemsToDelete = [itemIds[0], itemIds[1]]

        const deleteRes = await api.post(
          "/store/cart/delete-items",
          {
            cart_id: cart.id,
            items: itemsToDelete,
          },
          {
            headers: {
              "x-publishable-api-key": publishableApiKeyToken,
            },
          }
        )

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.data.deleted_items).toHaveLength(2)
        expect(deleteRes.data.deleted_items).toEqual(expect.arrayContaining(itemsToDelete))
        expect(deleteRes.data.cart.items).toHaveLength(1)
        expect(deleteRes.data.cart.items[0].id).toBe(itemIds[2])
      })

      it("should handle invalid request gracefully", async () => {
        // Missing cart_id
        const resMissingCart = await api.post(
          "/store/cart/delete-items",
          { items: ["item_123"] },
          { headers: { "x-publishable-api-key": publishableApiKeyToken } }
        ).catch(e => e.response)
        expect(resMissingCart.status).toBe(400)
        expect(resMissingCart.data.message).toContain("Missing required field: cart_id")

        // Missing items array
        const resMissingItems = await api.post(
          "/store/cart/delete-items",
          { cart_id: "cart_123" },
          { headers: { "x-publishable-api-key": publishableApiKeyToken } }
        ).catch(e => e.response)
        expect(resMissingItems.status).toBe(400)
        expect(resMissingItems.data.message).toContain("Missing required field: items")

        // Empty items array
        const resEmptyItems = await api.post(
          "/store/cart/delete-items",
          { cart_id: "cart_123", items: [] },
          { headers: { "x-publishable-api-key": publishableApiKeyToken } }
        ).catch(e => e.response)
        expect(resEmptyItems.status).toBe(400)
        expect(resEmptyItems.data.message).toContain("Missing required field: items")
      })

      it("should ignore items that do not belong to the cart", async () => {
        // Create Cart A
        const cartA = await cartModule.createCarts({
          email: "cartA@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        // Create Cart B
        const cartB = await cartModule.createCarts({
          email: "cartB@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")

        // Add item to Cart A
        await cartModule.addLineItems(cartA.id, [{
          variant_id: adultVariant.id, quantity: 1, unit_price: 200, title: "Item A"
        }])

        // Add item to Cart B
        await cartModule.addLineItems(cartB.id, [{
          variant_id: adultVariant.id, quantity: 1, unit_price: 200, title: "Item B"
        }])

        // Get Item IDs
        const { data: cartAData } = await query.graph({ entity: "cart", fields: ["items.id"], filters: { id: cartA.id } })
        const { data: cartBData } = await query.graph({ entity: "cart", fields: ["items.id"], filters: { id: cartB.id } })

        const itemAId = cartAData[0].items[0].id
        const itemBId = cartBData[0].items[0].id

        // Try to delete Item B using Cart A's ID
        // The endpoint should filter this out as invalid/unowned
        const res = await api.post(
          "/store/cart/delete-items",
          {
            cart_id: cartA.id,
            items: [itemBId],
          },
          { headers: { "x-publishable-api-key": publishableApiKeyToken } }
        ).catch(e => e.response)

        // Should return 400 because no valid items were found to delete
        expect(res.status).toBe(400)
        expect(res.data.message).toContain("No valid line items found")

        // Try to delete [Item A, Item B] using Cart A's ID
        // Should only delete Item A
        const resMixed = await api.post(
          "/store/cart/delete-items",
          {
            cart_id: cartA.id,
            items: [itemAId, itemBId],
          },
          { headers: { "x-publishable-api-key": publishableApiKeyToken } }
        )

        expect(resMixed.status).toBe(200)
        expect(resMixed.data.deleted_items).toEqual([itemAId]) // Should NOT contain itemBId
        expect(resMixed.data.cart.items).toHaveLength(0) // Cart A should now be empty
      })
    })
  },
})
