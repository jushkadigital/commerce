import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows"
import { TOUR_MODULE, PassengerType } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"
import completeCartWithToursWorkflow from "../../src/modules/tour/workflows/create-tour-booking"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Tour Purchase Flow - E2E", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let orderModule: any
      let paymentModule: any
      let remoteLink: any
      let query: any

      let tour: any
      let product: any
      let region: any
      let salesChannel: any
      let productVariants: any[] = []
      const testDate = "2026-04-15"
      const tourCapacity = 10

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        orderModule = container.resolve(Modules.ORDER)
        paymentModule = container.resolve(Modules.PAYMENT)
        remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
        query = container.resolve("query")
      })

      beforeEach(async () => {
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Test Sales Channel",
        })

        region = await regionModule.createRegions({
          name: "Test Region",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        })

        product = await productModule.createProducts({
          title: "Cusco City Tour",
          description: "Amazing city tour of Cusco",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [
            {
              title: "Passenger Type",
              values: ["Adult", "Child", "Infant"],
            },
          ],
        })

        tour = await tourModuleService.createTours({
          product_id: product.id,
          destination: "Cusco",
          description: "Full day city tour of Cusco",
          duration_days: 1,
          max_capacity: tourCapacity,
        })

        const passengerTypes = ["adult", "child", "infant"]
        for (const type of passengerTypes) {
          const variant = await productModule.createProductVariants({
            product_id: product.id,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Ticket`,
            sku: `CUSCO-${type.toUpperCase()}-001`,
            prices: [
              {
                currency_code: "usd",
                amount: type === "adult" ? 150 : type === "child" ? 100 : 0,
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

        product = await productModule.retrieveProduct(product.id, {
          relations: ["variants"],
        })
      })

      afterEach(async () => {
        try {
          const bookings = await tourModuleService.listTourBookings({
            tour_id: tour.id,
          })
          if (bookings.length > 0) {
            await tourModuleService.deleteTourBookings(
              bookings.map((b) => b.id)
            )
          }

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

      async function createCartWithTour(
        customerEmail: string,
        passengerCounts: { adults: number; children: number; infants: number } = { adults: 1, children: 0, infants: 0 }
      ) {
        const adultVariant = product.variants.find(
          (v: any) => v.title === "Adult Ticket"
        )
        const childVariant = product.variants.find(
          (v: any) => v.title === "Child Ticket"
        )
        const infantVariant = product.variants.find(
          (v: any) => v.title === "Infant Ticket"
        )

        if (!adultVariant) {
          throw new Error("Adult variant not found")
        }

        const items: any[] = []
        let totalPassengers = 0

        if (passengerCounts.adults > 0) {
          items.push({
            variant_id: adultVariant.id,
            quantity: 1,
            unit_price: 150 * passengerCounts.adults,
            title: `${tour.destination} - ${testDate} (Adults)`,
            metadata: {
              is_tour: true,
              tour_id: tour.id,
              tour_date: testDate,
              tour_destination: tour.destination,
              tour_duration_days: tour.duration_days,
              total_passengers: passengerCounts.adults,
              passengers: {
                adults: passengerCounts.adults,
                children: 0,
                infants: 0,
              },
              group_id: `tour-${tour.id}-${testDate}`,
              pricing_breakdown: [
                {
                  type: "ADULT",
                  quantity: passengerCounts.adults,
                  unit_price: 150,
                },
              ],
            },
          })
          totalPassengers += passengerCounts.adults
        }

        if (passengerCounts.children > 0 && childVariant) {
          items.push({
            variant_id: childVariant.id,
            quantity: 1,
            unit_price: 100 * passengerCounts.children,
            title: `${tour.destination} - ${testDate} (Children)`,
            metadata: {
              is_tour: true,
              tour_id: tour.id,
              tour_date: testDate,
              tour_destination: tour.destination,
              tour_duration_days: tour.duration_days,
              total_passengers: passengerCounts.children,
              passengers: {
                adults: 0,
                children: passengerCounts.children,
                infants: 0,
              },
              group_id: `tour-${tour.id}-${testDate}`,
              pricing_breakdown: [
                {
                  type: "CHILD",
                  quantity: passengerCounts.children,
                  unit_price: 100,
                },
              ],
            },
          })
          totalPassengers += passengerCounts.children
        }

        if (passengerCounts.infants > 0 && infantVariant) {
          items.push({
            variant_id: infantVariant.id,
            quantity: 1,
            unit_price: 0,
            title: `${tour.destination} - ${testDate} (Infants)`,
            metadata: {
              is_tour: true,
              tour_id: tour.id,
              tour_date: testDate,
              tour_destination: tour.destination,
              tour_duration_days: tour.duration_days,
              total_passengers: passengerCounts.infants,
              passengers: {
                adults: 0,
                children: 0,
                infants: passengerCounts.infants,
              },
              group_id: `tour-${tour.id}-${testDate}`,
              pricing_breakdown: [
                {
                  type: "INFANT",
                  quantity: passengerCounts.infants,
                  unit_price: 0,
                },
              ],
            },
          })
          totalPassengers += passengerCounts.infants
        }

        const cart = await cartModule.createCarts({
          currency_code: "usd",
          email: customerEmail,
          sales_channel_id: salesChannel.id,
          region_id: region.id,
          items,
        })

        await createPaymentCollectionForCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
          },
        })

        const { data: carts } = await query.graph({
          entity: "cart",
          fields: ["id", "total", "payment_collection.id"],
          filters: { id: cart.id },
        })
        const cartWithPayment = carts[0]

        await paymentModule.createPaymentSession(
          cartWithPayment.payment_collection.id,
          {
            provider_id: "pp_system_default",
            currency_code: "usd",
            amount: cartWithPayment.total,
            data: {},
          }
        )

        const { data: cartsWithItems } = await query.graph({
          entity: "cart",
          fields: ["id", "total", "items.*", "items.metadata"],
          filters: { id: cart.id },
        })

        return { cart: cartsWithItems[0], totalPassengers }
      }

      describe("Complete Purchase Flow - Success Cases", () => {
        it("should complete full purchase flow and create order and booking", async () => {
          const initialCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(tourCapacity)

          const { cart, totalPassengers } = await createCartWithTour(
            "test@example.com",
            { adults: 1, children: 0, infants: 0 }
          )

          expect(cart).toBeDefined()
          expect(cart.items).toHaveLength(1)
          expect(cart.items[0].metadata.is_tour).toBe(true)
          expect(cart.items[0].metadata.tour_id).toBe(tour.id)

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          expect(result).toBeDefined()
          expect((result as any).order).toBeDefined()
          expect((result as any).order.id).toBeDefined()
          expect((result as any).order.email).toBe("test@example.com")
          expect((result as any).order.items).toHaveLength(1)

          const orderId = (result as any).order.id

          // Verify tour booking was created
          const bookings = await tourModuleService.listTourBookings({
            tour_id: tour.id,
            tour_date: new Date(testDate),
          })

          expect(bookings).toHaveLength(1)
          const booking = bookings[0]
          expect(booking.order_id).toBe(orderId)
          expect(booking.status).toBe("pending")

          // Verify capacity was reduced
          const remainingCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(tourCapacity - 1)
        })

        it("should handle mixed passenger types via API endpoint", async () => {
          // Create an empty cart first via API
          const createRes = await api.post(`/store/carts`, {
            email: "mixed-api@test.com",
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            currency_code: "usd",
          })

          expect(createRes.status).toEqual(200)
          const cartId = createRes.data.cart.id

          // Call the new endpoint to add tour items with mixed passengers
          const body = {
            cart_id: cartId,
            tour_id: tour.id,
            tour_date: testDate,
            adults: 2,
            children: 2,
            infants: 0,
          }

          const addRes = await api.post(`/store/cart/tour-items`, body)
          expect(addRes.status).toEqual(200)
          // endpoint returns { cart, summary }
          const cart = addRes.data.cart

          // Cart should have 2 separate line items (adult + child)
          expect(cart.items).toBeDefined()
          // Filter only tour items
          const tourItems = cart.items.filter((i: any) => i.metadata?.is_tour)
          expect(tourItems).toHaveLength(2)

          const adultItem = tourItems.find((i: any) => i.metadata.pricing_breakdown?.[0]?.type === "ADULT")
          const childItem = tourItems.find((i: any) => i.metadata.pricing_breakdown?.[0]?.type === "CHILD")

          expect(adultItem).toBeDefined()
          expect(childItem).toBeDefined()

          // Verify metadata.passengers structure
          expect(adultItem.metadata.passengers).toEqual({ adults: 2, children: 0, infants: 0 })
          expect(childItem.metadata.passengers).toEqual({ adults: 0, children: 2, infants: 0 })

          // Verify group_id shared
          expect(adultItem.metadata.group_id).toBeDefined()
          expect(adultItem.metadata.group_id).toEqual(childItem.metadata.group_id)

          // Create payment collection for this cart
          await createPaymentCollectionForCartWorkflow(container).run({ input: { cart_id: cartId } })

          const { data: cartsWithPayment } = await query.graph({ entity: "cart", fields: ["id", "total", "payment_collection.id"], filters: { id: cartId } })
          const cartWithPayment = cartsWithPayment[0]

          await paymentModule.createPaymentSession(cartWithPayment.payment_collection.id, {
            provider_id: "pp_system_default",
            currency_code: "usd",
            amount: cartWithPayment.total,
            data: {},
          })

          // Complete checkout using the workflow
          const { result } = await completeCartWithToursWorkflow(container).run({ input: { cart_id: cartId } })
          expect(result).toBeDefined()
          const order = (result as any).order
          expect(order).toBeDefined()
          expect(order.items).toHaveLength(2)

          // Verify booking created with two line items
          const bookings = await tourModuleService.listTourBookings({ tour_id: tour.id, tour_date: new Date(testDate) })
          // There should be 1 booking that contains 2 line items (grouped)
          expect(bookings.length).toBeGreaterThan(0)
          const booking = bookings.find((b: any) => b.order_id === order.id)
          expect(booking).toBeDefined()
          // booking.line_items should contain the two created items
          expect(booking!.line_items).toHaveLength(2)
        })

        it("should create booking with correct metadata", async () => {
          const { cart } = await createCartWithTour("meta@example.com", { adults: 3, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = (result as any).order.id

          // Query booking with all details
          const { data: bookings } = await query.graph({
            entity: "tour_booking",
            fields: ["id", "order_id", "tour_date", "status", "line_items"],
            filters: {
              order_id: orderId,
            },
          })

          expect(bookings).toHaveLength(1)
          const booking = bookings[0]
          expect(booking.order_id).toBe(orderId)
          expect(booking.status).toBe("pending")
          expect(new Date(booking.tour_date).toISOString().split("T")[0]).toBe(testDate)
        })

        it("should handle multiple tours in same cart", async () => {
          // Create a second tour
          const product2 = await productModule.createProducts({
            title: "Lima City Tour",
            description: "Lima city tour",
            status: "published",
            sales_channels: [{ id: salesChannel.id }],
            options: [
              {
                title: "Passenger Type",
                values: ["Adult", "Child", "Infant"],
              },
            ],
          })

          const tour2 = await tourModuleService.createTours({
            product_id: product2.id,
            destination: "Lima",
            description: "City tour in Lima",
            duration_days: 1,
            max_capacity: 5,
          })

          // Create variant for second tour
          const variant2 = await productModule.createProductVariants({
            product_id: product2.id,
            title: "Adult Ticket",
            sku: "LIMA-ADULT-001",
            prices: [
              {
                currency_code: "usd",
                amount: 50,
              },
            ],
            options: {
              "Passenger Type": "Adult",
            },
          })

          await tourModuleService.createTourVariants({
            tour_id: tour2.id,
            variant_id: variant2.id,
            passenger_type: PassengerType.ADULT,
          })

          const adultVariant1 = product.variants.find(
            (v: any) => v.title === "Adult Ticket"
          )

          // Create cart with both tours
          const cart = await cartModule.createCarts({
            currency_code: "usd",
            email: "multi@example.com",
            sales_channel_id: salesChannel.id,
            region_id: region.id,
            items: [
              {
                variant_id: adultVariant1.id,
                quantity: 1,
                unit_price: 150,
                title: `Cusco - ${testDate}`,
                metadata: {
                  is_tour: true,
                  tour_id: tour.id,
                  tour_date: testDate,
                  total_passengers: 1,
                  group_id: `tour-${tour.id}-${testDate}`,
                },
              },
              {
                variant_id: variant2.id,
                quantity: 1,
                unit_price: 50,
                title: `Lima - ${testDate}`,
                metadata: {
                  is_tour: true,
                  tour_id: tour2.id,
                  tour_date: testDate,
                  total_passengers: 1,
                  group_id: `tour-${tour2.id}-${testDate}`,
                },
              },
            ],
          })

          // Create payment collection for cart
          await createPaymentCollectionForCartWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const { data: cartsWithPayment } = await query.graph({
            entity: "cart",
            fields: ["id", "total", "payment_collection.id"],
            filters: { id: cart.id },
          })
          const cartWithPayment = cartsWithPayment[0]

          await paymentModule.createPaymentSession(
            cartWithPayment.payment_collection.id,
            {
              provider_id: "pp_system_default",
              currency_code: "usd",
              amount: cartWithPayment.total,
              data: {},
            }
          )

          // Complete checkout
          const result = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = (result as any).result.order.id

          // Verify both bookings were created
          const bookings1 = await tourModuleService.listTourBookings({
            tour_id: tour.id,
          })
          const bookings2 = await tourModuleService.listTourBookings({
            tour_id: tour2.id,
          })

          expect(bookings1).toHaveLength(1)
          expect(bookings2).toHaveLength(1)
          expect(bookings1[0].order_id).toBe(orderId)
          expect(bookings2[0].order_id).toBe(orderId)

          // Cleanup tour2 data
          await tourModuleService.deleteTourBookings(bookings2.map((b: any) => b.id))
          await tourModuleService.deleteTourVariants({ tour_id: tour2.id })
          await tourModuleService.deleteTours(tour2.id)
          await productModule.deleteProductVariants(variant2.id)
          await productModule.deleteProducts(product2.id)
        })

        it("should complete full purchase flow for a single adult passenger", async () => {
          const initialCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(tourCapacity)

          const { cart, totalPassengers } = await createCartWithTour(
            "single-adult@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          expect(cart).toBeDefined()
          expect(cart.items).toHaveLength(1)
          expect(cart.items[0].metadata.is_tour).toBe(true)
          expect(cart.items[0].metadata.tour_id).toBe(tour.id)

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          expect(result).toBeDefined()
          expect((result as any).order).toBeDefined()
          expect((result as any).order.id).toBeDefined()
          expect((result as any).order.email).toBe("single-adult@test.com")
          expect((result as any).order.items).toHaveLength(1)
        })

        it("should reject booking for blocked date", async () => {
          await tourModuleService.updateTours({
            id: tour.id,
            blocked_dates: [testDate]
          })

          const { cart } = await createCartWithTour(
            "blocked-date@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("not available")

          await tourModuleService.updateTours({
            id: tour.id,
            blocked_dates: []
          })
        })

        it("should reject booking for blocked weekday", async () => {
          const tourDateObj = new Date(testDate)
          const dayOfWeek = tourDateObj.getDay()

          await tourModuleService.updateTours({
            id: tour.id,
            blocked_week_days: [dayOfWeek.toString()]
          })

          const { cart } = await createCartWithTour(
            "blocked-weekday@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("not available")

          await tourModuleService.updateTours({
            id: tour.id,
            blocked_week_days: []
          })
        })

        it("should reject booking when capacity is exceeded", async () => {
          // Create carts sequentially and wait for each booking to be created
          for (let i = 0; i < tourCapacity; i++) {
            const { cart } = await createCartWithTour(
              `capacity${i}@test.com`,
              { adults: 1, children: 0, infants: 0 }
            )
            await completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
            
            // Wait for the booking to be committed to the database
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          const { cart } = await createCartWithTour(
            "exceed-capacity@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("spots available")
        })

        it("should reject booking when min days ahead not met", async () => {
          await tourModuleService.updateTours({
            id: tour.id,
            booking_min_days_ahead: 365
          })

          const { cart } = await createCartWithTour(
            "min-days@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("days in advance")

          await tourModuleService.updateTours({
            id: tour.id,
            booking_min_days_ahead: 0
          })
        })

        it("should reject booking for past dates", async () => {
          const pastDate = "2020-01-01"

          const adultVariant = product.variants.find(
            (v: any) => v.title === "Adult Ticket"
          )

          const cart = await cartModule.createCarts({
            currency_code: "usd",
            email: "past-date@test.com",
            sales_channel_id: salesChannel.id,
            region_id: region.id,


            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 150,
              title: `${tour.destination} - ${pastDate}`,
              metadata: {
                is_tour: true,
                tour_id: tour.id,
                tour_date: pastDate,
                total_passengers: 1,
              },
            }],
          })

          await createPaymentCollectionForCartWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          const { data: carts } = await query.graph({
            entity: "cart",
            fields: ["id", "total", "payment_collection.id"],
            filters: { id: cart.id },
          })

          await paymentModule.createPaymentSession(
            carts[0].payment_collection.id,
            {
              provider_id: "pp_system_default",
              currency_code: "usd",
              amount: carts[0].total,
              data: {},
            }
          )

          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("past dates")
        })
      })

      describe("Capacity Validation", () => {
        it("should validate capacity before allowing checkout", async () => {
          // First fill up capacity
          for (let i = 0; i < tourCapacity; i++) {
            const { cart } = await createCartWithTour(`fill${i}@test.com`, { adults: 1, children: 0, infants: 0 })
            await completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          // Verify capacity is full
          const capacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(capacity).toBe(0)

          // Try to book one more - should fail
          const { cart } = await createCartWithTour("extra@test.com", { adults: 1, children: 0, infants: 0 })

          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
        })
      })

      describe("Order and Booking Link", () => {
        it("should create link between order and tour booking", async () => {
          const { cart } = await createCartWithTour("link@example.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          const orderId = (result as any).order.id

          // Query through link
          const { data: linkedBookings } = await query.graph({
            entity: "tour_booking_order",
            fields: ["tour_booking.*", "order.*"],
            filters: { order_id: orderId },
          })

          expect(linkedBookings).toHaveLength(1)
          expect(linkedBookings[0].order.id).toBe(orderId)
          expect(linkedBookings[0].tour_booking.order_id).toBe(orderId)
        })

        it("should preserve order totals correctly", async () => {
          const { cart } = await createCartWithTour("totals@example.com", { adults: 3, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          const order = (result as any).order

          // Verify order has items and totals
          expect(order.items).toBeDefined()
          expect(order.items!.length).toBeGreaterThan(0)
          expect(order.total).toBeGreaterThan(0)
          expect(order.subtotal).toBeGreaterThan(0)
        })
      })

      describe("Error Handling", () => {
        it("should handle invalid cart id gracefully", async () => {
          const { errors } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: "invalid_cart_id" },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
        })

        it("should validate booking for a valid future date with available capacity", async () => {
          const futureDate = "2030-12-25"

          const validation = await tourModuleService.validateBooking(
            tour.id,
            new Date(futureDate),
            1
          )

          expect(validation.valid).toBe(true)
        })

        it("should validate booking date is not in the past", async () => {
          const pastDate = "2020-01-01"

          const validation = await tourModuleService.validateBooking(
            tour.id,
            new Date(pastDate),
            1
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("past")
        })
      })

      describe("Booking Status Flow", () => {
        it("should create booking with pending status initially", async () => {
          const { cart } = await createCartWithTour("pending@example.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          const orderId = (result as any).order.id

          const bookings = await tourModuleService.listTourBookings({
            order_id: orderId,
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].status).toBe("pending")
        })

        it("should allow updating booking status", async () => {
          const { cart } = await createCartWithTour("update@example.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          const orderId = (result as any).order.id

          const bookings = await tourModuleService.listTourBookings({
            order_id: orderId,
          })

          // Update status to confirmed
          await tourModuleService.updateTourBookings({
            id: bookings[0].id,
            status: "confirmed",
          })

          // Verify status updated
          const updated = await tourModuleService.retrieveTourBooking(bookings[0].id)
          expect(updated.status).toBe("confirmed")
        })
      })
    })
  },
})
