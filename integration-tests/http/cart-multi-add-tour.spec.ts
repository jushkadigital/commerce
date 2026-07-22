import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { TOUR_MODULE, PassengerType } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"
import addBookingToCartWorkflow from "../../src/workflows/add-booking-to-cart"
import deleteLineItemsSlimWorkflow from "../../src/workflows/delete-line-items-slim"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Cart Multi-Add Tour Items", () => {
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
      const testDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Multi-Add Channel",
        })

        region = await regionModule.createRegions({
          name: "Multi-Add Region",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        })

        product = await productModule.createProducts({
          title: "Multi Tour",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Passenger Type", values: ["Adult"] }],
        })

        tour = await tourModuleService.createTours({
          product_id: product.id,
          slug: `multi-tour-${Date.now()}`,
          destination: "Test",
          duration_days: 1,
          max_capacity: 10,
        })

        const variant = await productModule.createProductVariants({
          product_id: product.id,
          title: "Adult Ticket",
          sku: `MULTI-ADULT-${Date.now()}`,
          prices: [{ currency_code: "usd", amount: 100 }],
          options: { "Passenger Type": "Adult" },
          requires_shipping: false,
          manage_inventory: false,
          allow_backorder: true,
        })

        await tourModuleService.createTourVariants({
          tour_id: tour.id,
          variant_id: variant.id,
          passenger_type: PassengerType.ADULT,
        })

        product = await productModule.retrieveProduct(product.id, {
          relations: ["variants"],
        })

        const { result: keyResult } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [{
              title: `multi-add-key-${Date.now()}`,
              type: "publishable",
              created_by: "test",
            }],
          },
        })

        publishableApiKeyToken = keyResult[0].token

        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: { id: keyResult[0].id, add: [salesChannel.id] },
        })
      })

      afterEach(async () => {
        try {
          await tourModuleService.deleteTourVariants({ tour_id: tour.id })
          await tourModuleService.deleteTours(tour.id)
          await productModule.deleteProducts(product.id)
          await regionModule.deleteRegions(region.id)
          await salesChannelModule.deleteSalesChannels(salesChannel.id)
        } catch (e) {
          // cleanup
        }
      })

      async function getCartItems(cartId: string) {
        const { data: carts } = await query.graph({
          entity: "cart",
          fields: ["id", "items.id", "items.metadata", "items.quantity"],
          filters: { id: cartId },
        })
        return carts[0]?.items || []
      }

      it("should add first tour and see it in cart", async () => {
        const cart = await cartModule.createCarts({
          email: "multi1@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")

        const { result } = await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 1,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        expect(result).toBeDefined()
        expect(result.cart).toBeDefined()

        const items = await getCartItems(cart.id)
        const tourItems = items.filter((i: any) => i.metadata?.is_tour)
        expect(tourItems.length).toBe(1)
      })

      it("should add second tour to same cart and see both", async () => {
        const cart = await cartModule.createCarts({
          email: "multi2@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")

        // First add
        await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 1,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        let items = await getCartItems(cart.id)
        let tourItems = items.filter((i: any) => i.metadata?.is_tour)
        expect(tourItems.length).toBe(1)

        // Second add (same tour, more adults)
        const { result: result2 } = await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 2,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 2,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        expect(result2).toBeDefined()
        expect(result2.cart).toBeDefined()

        items = await getCartItems(cart.id)
        tourItems = items.filter((i: any) => i.metadata?.is_tour)
        expect(tourItems.length).toBe(2)
      })

      it("should delete all items and re-add a tour", async () => {
        const cart = await cartModule.createCarts({
          email: "multi3@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")

        // Add tour
        await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 1,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        let items = await getCartItems(cart.id)
        expect(items.filter((i: any) => i.metadata?.is_tour).length).toBe(1)

        // Delete all items
        const itemIds = items.map((i: any) => i.id)
        await deleteLineItemsSlimWorkflow(container).run({
          input: {
            cart_id: cart.id,
            ids: itemIds,
          },
        })

        items = await getCartItems(cart.id)
        expect(items.length).toBe(0)

        // Re-add tour
        const { result } = await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 1,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        expect(result).toBeDefined()

        items = await getCartItems(cart.id)
        const tourItems = items.filter((i: any) => i.metadata?.is_tour)
        expect(tourItems.length).toBe(1)
      })

      it("should see items via GET /store/carts/:id HTTP after adding tour (cache test)", async () => {
        const cart = await cartModule.createCarts({
          email: "cache-test@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          currency_code: "usd",
        })

        const adultVariant = product.variants.find((v: any) => v.title === "Adult Ticket")

        // Add tour via workflow
        await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 1,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        // Add a second tour to same cart
        await addBookingToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            type: "tour",
            id: tour.id,
            date: testDate,
            adults: 2,
            children: 0,
            infants: 0,
            items: [{
              variant_id: adultVariant.id,
              quantity: 2,
              unit_price: 100,
              metadata: { tour_date: testDate },
            }],
            additional_data: {},
          },
        })

        // Fetch via HTTP GET — this is the endpoint the frontend calls.
        // If conditionalCartFetchStep Phase 1 cache contaminates this endpoint,
        // the response will have missing or empty items.
        const response = await api.get(`/store/carts/${cart.id}`, {
          headers: {
            "x-publishable-api-key": publishableApiKeyToken,
          },
        })

        expect(response.status).toBe(200)
        expect(response.data.cart).toBeDefined()
        expect(response.data.cart.items).toBeDefined()
        expect(response.data.cart.items.length).toBe(2)

        // Verify both tour items are present
        const tourItems = response.data.cart.items.filter(
          (i: any) => i.metadata?.is_tour
        )
        expect(tourItems.length).toBe(2)

        // Verify promotions is always an array (not undefined)
        expect(response.data.cart.promotions).toBeDefined()
        expect(Array.isArray(response.data.cart.promotions)).toBe(true)
      })
    })
  },
})
