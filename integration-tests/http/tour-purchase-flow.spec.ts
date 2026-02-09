import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE, PassengerType } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"
import completeCartWithToursWorkflow from "../../src/modules/tour/workflows/create-tour-booking"

jest.setTimeout(120 * 1000)

/**
 * Integration tests for complete tour purchase flow (E2E)
 * 
 * These tests verify the entire purchase flow:
 * 1. Create tour with capacity and available dates
 * 2. Create cart with tour item
 * 3. Add customer information
 * 4. Select shipping method
 * 5. Complete checkout (with mocked payment)
 * 6. Verify order created correctly
 * 7. Verify booking created in TourModule
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Tour Purchase Flow - E2E", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let pricingModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let customerModule: any
      let fulfillmentModule: any
      let paymentModule: any
      let orderModule: any
      let remoteLink: any
      let query: any

      // Test data
      let tour: any
      let product: any
      let region: any
      let salesChannel: any
      let shippingProfile: any
      let shippingOption: any
      let productVariants: any[] = []
      const testDate = "2026-04-15"
      const tourCapacity = 10

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        pricingModule = container.resolve(Modules.PRICING)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        customerModule = container.resolve(Modules.CUSTOMER)
        fulfillmentModule = container.resolve(Modules.FULFILLMENT)
        paymentModule = container.resolve(Modules.PAYMENT)
        orderModule = container.resolve(Modules.ORDER)
        remoteLink = container.resolve("remoteLink")
        query = container.resolve("query")
      })

      beforeEach(async () => {
        // Create sales channel
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Test Sales Channel",
        })

        // Create region with currency
        region = await regionModule.createRegions({
          name: "Test Region",
          currency_code: "usd",
          countries: ["us"],
        })

        // Create a shipping profile
        shippingProfile = await fulfillmentModule.createShippingProfiles({
          name: "Test Shipping Profile",
          type: "default",
        })

        // Create shipping option
        shippingOption = await fulfillmentModule.createShippingOptions({
          name: "Standard Shipping",
          service_zone_id: region.id,
          shipping_profile_id: shippingProfile.id,
          provider_id: "manual_manual",
          price_type: "flat",
          rules: [
            {
              attribute: "enabled",
              operator: "eq",
              value: "true",
            },
          ],
        })

        // Create product for the tour
        product = await productModule.createProducts({
          title: "Cusco City Tour",
          description: "Amazing city tour of Cusco",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
        })

        // Create tour with capacity
        tour = await tourModuleService.createTours({
          product_id: product.id,
          destination: "Cusco",
          description: "Full day city tour of Cusco",
          duration_days: 1,
          max_capacity: tourCapacity,
          available_dates: [testDate],
        })

        // Create variants for each passenger type
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
              passenger_type: type,
            },
          })

          productVariants.push(variant)

          // Create tour variant link
          await tourModuleService.createTourVariants({
            tour_id: tour.id,
            variant_id: variant.id,
            passenger_type: type as PassengerType,
          })
        }

        // Re-fetch product with variants
        product = await productModule.retrieveProduct(product.id, {
          relations: ["variants"],
        })
      })

      afterEach(async () => {
        // Clean up test data
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

          // Delete product and variants
          for (const variant of productVariants) {
            await productModule.deleteProductVariants(variant.id)
          }
          await productModule.deleteProducts(product.id)

          await fulfillmentModule.deleteShippingOptions(shippingOption.id)
          await fulfillmentModule.deleteShippingProfiles(shippingProfile.id)
          await regionModule.deleteRegions(region.id)
          await salesChannelModule.deleteSalesChannels(salesChannel.id)
        } catch (error) {
          console.error("Cleanup error:", error)
        }

        productVariants = []
      })

      /**
       * Helper function to create a cart with tour items
       */
      async function createCartWithTour(
        customerEmail: string,
        passengerCounts: { adults: number; children: number; infants: number } = { adults: 1, children: 0, infants: 0 }
      ) {
        // Create or retrieve customer
        const customers = await customerModule.listCustomers({
          email: customerEmail,
        })

        let customer
        if (customers.length === 0) {
          customer = await customerModule.createCustomers({
            email: customerEmail,
            first_name: "Test",
            last_name: "Customer",
          })
        } else {
          customer = customers[0]
        }

        // Find variants
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
        let totalPrice = 0
        const pricingBreakdown: any[] = []

        // Add adult tickets
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
          totalPrice += 150 * passengerCounts.adults
          pricingBreakdown.push({
            type: "ADULT",
            quantity: passengerCounts.adults,
            unit_price: 150,
          })
        }

        // Add child tickets
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
          totalPrice += 100 * passengerCounts.children
          pricingBreakdown.push({
            type: "CHILD",
            quantity: passengerCounts.children,
            unit_price: 100,
          })
        }

        // Add infant tickets
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
          pricingBreakdown.push({
            type: "INFANT",
            quantity: passengerCounts.infants,
            unit_price: 0,
          })
        }

        // Create cart
        const cart = await cartModule.createCarts({
          currency_code: "usd",
          email: customerEmail,
          customer_id: customer.id,
          sales_channel_id: salesChannel.id,
          region_id: region.id,
          shipping_address: {
            first_name: "Test",
            last_name: "Customer",
            address_1: "123 Test St",
            city: "Test City",
            country_code: "us",
            postal_code: "12345",
          },
          billing_address: {
            first_name: "Test",
            last_name: "Customer",
            address_1: "123 Test St",
            city: "Test City",
            country_code: "us",
            postal_code: "12345",
          },
          items,
        })

        // Add shipping method to cart
        await cartModule.addShippingMethod({
          cart_id: cart.id,
          option_id: shippingOption.id,
        })

        return { cart, totalPassengers, totalPrice }
      }

      describe("Complete Purchase Flow - Success Cases", () => {
        it("should complete full purchase flow for a single adult passenger", async () => {
          // Verify initial capacity
          const initialCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(tourCapacity)

          // Step 1: Create cart with tour item
          const { cart, totalPassengers } = await createCartWithTour(
            "single-adult@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          expect(cart).toBeDefined()
          expect(cart.items).toHaveLength(1)
          expect(cart.items[0].metadata.is_tour).toBe(true)
          expect(cart.items[0].metadata.tour_id).toBe(tour.id)

          // Step 2: Complete checkout using workflow
          const { result } = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          // Step 3: Verify order was created
          expect(result).toBeDefined()
          expect((result as any).order).toBeDefined()
          expect((result as any).order.id).toBeDefined()
          expect((result as any).order.email).toBe("single-adult@test.com")
          expect((result as any).order.items).toHaveLength(1)

          // Step 4: Verify capacity was reduced
          const remainingCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(tourCapacity - totalPassengers)

          // Step 5: Verify booking was created
          const bookings = await tourModuleService.listTourBookings({
            tour_id: tour.id,
            tour_date: new Date(testDate),
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].order_id).toBe((result as any).order.id)
          expect(bookings[0].tour_id).toBe(tour.id)
          expect(bookings[0].status).toBe("pending")
        })

        it("should complete purchase with mixed passenger types", async () => {
          const { cart, totalPassengers } = await createCartWithTour(
            "family@test.com",
            { adults: 2, children: 1, infants: 1 }
          )

          expect(cart.items).toHaveLength(3) // 3 different passenger types

          // Complete checkout
          const { result } = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          // Verify order
          expect((result as any).order).toBeDefined()
          expect((result as any).order.items).toHaveLength(3)

          // Verify capacity reduced correctly (4 total passengers)
          const remainingCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(tourCapacity - totalPassengers)

          // Verify booking
          const bookings = await tourModuleService.listTourBookings({
            tour_id: tour.id,
          })
          expect(bookings).toHaveLength(1)
        })

        it("should complete multiple separate purchases for same tour", async () => {
          // First purchase
          const { cart: cart1, totalPassengers: passengers1 } = await createCartWithTour(
            "customer1@test.com",
            { adults: 2, children: 0, infants: 0 }
          )

          const result1 = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart1.id },
          })

          expect((result1 as any).order).toBeDefined()

          // Second purchase
          const { cart: cart2, totalPassengers: passengers2 } = await createCartWithTour(
            "customer2@test.com",
            { adults: 3, children: 1, infants: 0 }
          )

          const result2 = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart2.id },
          })

          expect((result2 as any).order).toBeDefined()

          // Verify total capacity used
          const remainingCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(tourCapacity - passengers1 - passengers2)

          // Verify both bookings exist
          const bookings = await tourModuleService.listTourBookings({
            tour_id: tour.id,
          })
          expect(bookings).toHaveLength(2)

          // Verify each booking has correct order_id
          const bookingOrderIds = bookings.map((b) => b.order_id)
          expect(bookingOrderIds).toContain((result1 as any).order.id)
          expect(bookingOrderIds).toContain((result2 as any).order.id)
        })

        it("should verify order contains correct pricing information", async () => {
          const { cart, totalPrice } = await createCartWithTour(
            "pricing-test@test.com",
            { adults: 2, children: 1, infants: 0 }
          )

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          // Verify order pricing (2 adults * 150 + 1 child * 100 = 400)
          expect((result as any).order.subtotal).toBe(400)
          expect((result as any).order.currency_code).toBe("usd")

          // Verify items have correct pricing
          const adultItems = (result as any).order.items.filter((item: any) => 
            item.metadata?.pricing_breakdown?.some((p: any) => p.type === "ADULT")
          )
          expect(adultItems.length).toBeGreaterThan(0)
        })
      })

      describe("Purchase Flow - Error Cases", () => {
        it("should fail when booking exceeds available capacity", async () => {
          // First, fill up almost all capacity (9 out of 10 spots)
          for (let i = 0; i < 9; i++) {
            const { cart } = await createCartWithTour(
              `filler${i}@test.com`,
              { adults: 1, children: 0, infants: 0 }
            )
            await completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
          }

          // Verify only 1 spot left
          const remainingCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(1)

          // Try to book 2 passengers when only 1 spot remains
          const { cart } = await createCartWithTour(
            "overflow@test.com",
            { adults: 2, children: 0, infants: 0 }
          )

          // This should fail
          await expect(
            completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
          ).rejects.toThrow()

          // Verify capacity is still 1 (booking didn't go through)
          const finalCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(finalCapacity).toBe(1)
        })

        it("should fail when tour is completely full", async () => {
          // Fill all capacity
          for (let i = 0; i < tourCapacity; i++) {
            const { cart } = await createCartWithTour(
              `full${i}@test.com`,
              { adults: 1, children: 0, infants: 0 }
            )
            await completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
          }

          // Verify capacity is 0
          const capacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(capacity).toBe(0)

          // Try to book when full
          const { cart } = await createCartWithTour(
            "toofull@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          await expect(
            completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
          ).rejects.toThrow()
        })

        it("should validate booking before attempting to book unavailable date", async () => {
          const unavailableDate = "2025-12-25"

          const validation = await tourModuleService.validateBooking(
            tour.id,
            new Date(unavailableDate),
            1
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("not available")
        })
      })

      describe("Order and Booking Verification", () => {
        it("should create order with correct customer information", async () => {
          const customerEmail = "verified-customer@test.com"
          const { cart } = await createCartWithTour(customerEmail, { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          // Verify customer info in order
          expect((result as any).order.email).toBe(customerEmail)
          expect((result as any).order.customer).toBeDefined()
        })

        it("should link booking to correct order", async () => {
          const { cart } = await createCartWithTour("link-test@test.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          // Query for booking linked to order
          const { data: bookings } = await query.graph({
            entity: "tour_booking",
            fields: ["id", "order_id", "tour_date", "status"],
            filters: {
              order_id: (result as any).order.id,
            },
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].order_id).toBe((result as any).order.id)
          expect(bookings[0].tour_date).toBeDefined()
        })

        it("should verify booking metadata contains correct tour info", async () => {
          const { cart } = await createCartWithTour("metadata-test@test.com", { adults: 2, children: 0, infants: 0 })

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          const bookings = await tourModuleService.listTourBookings({
            order_id: (result as any).order.id,
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].line_items).toBeDefined()
          expect(bookings[0].tour_date).toBeDefined()
        })
      })

      describe("Edge Cases and Boundary Conditions", () => {
        it("should handle booking at exact capacity limit", async () => {
          // Book capacity - 1 first
          for (let i = 0; i < tourCapacity - 1; i++) {
            const { cart } = await createCartWithTour(
              `exact${i}@test.com`,
              { adults: 1, children: 0, infants: 0 }
            )
            await completeCartWithToursWorkflow(container).run({
              input: { cart_id: cart.id },
            })
          }

          // Verify 1 spot left
          let capacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(capacity).toBe(1)

          // Book the last spot
          const { cart: finalCart } = await createCartWithTour(
            "last-spot@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: finalCart.id },
          })

          expect((result as any).order).toBeDefined()

          // Verify capacity is now 0
          capacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(capacity).toBe(0)
        })

        it("should handle cart with only infant tickets (zero price)", async () => {
          const { cart, totalPassengers } = await createCartWithTour(
            "infants-only@test.com",
            { adults: 0, children: 0, infants: 2 }
          )

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          expect((result as any).order).toBeDefined()
          expect((result as any).order.subtotal).toBe(0) // Infants are free

          const remainingCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(tourCapacity - totalPassengers)
        })

        it("should maintain data consistency after successful purchase", async () => {
          const { cart } = await createCartWithTour(
            "consistency@test.com",
            { adults: 1, children: 1, infants: 1 }
          )

          const { result } = await completeCartWithToursWorkflow(container).run({
            input: { cart_id: cart.id },
          })

          // Verify order exists in order module
          const order = await orderModule.retrieveOrder((result as any).order.id)
          expect(order).toBeDefined()
          expect(order.id).toBe((result as any).order.id)

          // Verify booking exists
          const bookings = await tourModuleService.listTourBookings({
            order_id: (result as any).order.id,
          })
          expect(bookings).toHaveLength(1)

          // Verify link exists between order and booking
          const { data: links } = await query.graph({
            entity: "tour_booking_order",
            fields: ["tour_booking_id", "order_id"],
            filters: {
              order_id: (result as any).order.id,
            },
          })

          expect(links.length).toBeGreaterThan(0)
        })
      })
    })
  },
})
