import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"
import completeCartWithToursWorkflow from "../../src/workflows/create-tour-booking"
import { generateTourLockKey } from "../../src/utils/locking"
import { PassengerType } from "../../src/modules/tour/models/tour-variant"
jest.setTimeout(120 * 1000)

/**
 * Integration tests for tour booking locking mechanism
 * 
 * These tests verify that the locking system prevents overbooking
 * when multiple users try to book the same tour simultaneously.
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Tour Booking Locking System", () => {
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
      let remoteLink: any
      let query: any

      // Test data
      let tour: any
      let product: any
      let region: any
      let salesChannel: any
      let shippingProfile: any
      let shippingOption: any
      let priceSet: any
      let productVariants: any[] = []
      const testDate = "2026-03-15"
      const tourCapacity = 5

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
          title: "Machu Picchu Full Day Tour",
          description: "Amazing tour to Machu Picchu",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
        })

        // Create tour with capacity
        tour = await tourModuleService.createTours({
          product_id: product.id,
          destination: "Machu Picchu",
          description: "Full day tour to Machu Picchu",
          duration_days: 1,
          max_capacity: tourCapacity,
        })

        // Create variants for each passenger type
        const passengerTypes = ["adult", "child", "infant"]
        for (const type of passengerTypes) {
          const variant = await productModule.createProductVariants({
            product_id: product.id,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Ticket`,
            sku: `MACHU-${type.toUpperCase()}-001`,
            prices: [
              {
                currency_code: "usd",
                amount: type === "adult" ? 100 : type === "child" ? 70 : 0,
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
            passenger_type: type === "adult" ? PassengerType.ADULT : type === "child" ? PassengerType.CHILD : PassengerType.INFANT
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
      async function createCartWithTour(customerEmail: string) {
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

        // Find adult variant
        const adultVariant = product.variants.find(
          (v: any) => v.title === "Adult Ticket"
        )

        if (!adultVariant) {
          throw new Error("Adult variant not found")
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
          items: [
            {
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              title: `${tour.destination} - ${testDate}`,
              metadata: {
                is_tour: true,
                tour_id: tour.id,
                tour_date: testDate,
                tour_destination: tour.destination,
                tour_duration_days: tour.duration_days,
                total_passengers: 1,
                passengers: {
                  adults: 1,
                  children: 0,
                  infants: 0,
                },
                pricing_breakdown: [
                  {
                    type: "ADULT",
                    quantity: 1,
                    unit_price: 100,
                  },
                ],
              },
            },
          ],
        })

        // Add shipping method to cart
        await cartModule.addShippingMethod({
          cart_id: cart.id,
          option_id: shippingOption.id,
        })

        return cart
      }

      describe("Concurrent Booking Prevention", () => {
        it("should prevent overbooking when multiple users book simultaneously", async () => {
          // Verify initial capacity
          const initialCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(tourCapacity)

          // Create 10 carts (more than capacity)
          const numberOfRequests = 10
          const carts: any[] = []

          for (let i = 0; i < numberOfRequests; i++) {
            const cart = await createCartWithTour(`customer${i}@test.com`)
            carts.push(cart)
          }

          // Execute all cart completions concurrently
          const results = await Promise.allSettled(
            carts.map((cart) =>
              completeCartWithToursWorkflow(container).run({
                input: {
                  cart_id: cart.id,
                },
              })
            )
          )

          // Count successful and failed bookings
          const successful = results.filter(
            (r) => r.status === "fulfilled"
          ).length
          const failed = results.filter((r) => r.status === "rejected").length

          // Verify exactly 'tourCapacity' bookings succeeded
          expect(successful).toBe(tourCapacity)
          expect(failed).toBe(numberOfRequests - tourCapacity)

          // Verify final capacity is 0
          const finalCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(finalCapacity).toBe(0)

          // Verify total bookings in database
          const bookings = await tourModuleService.listTourBookings({
            tour_id: tour.id,
            tour_date: new Date(testDate),
          })

          // Filter confirmed/pending bookings
          const activeBookings = bookings.filter(
            (b) => b.status === "confirmed" || b.status === "pending"
          )
          expect(activeBookings.length).toBe(tourCapacity)
        })

        it("should handle concurrent bookings for exactly the available capacity", async () => {
          // Create exactly 'tourCapacity' carts
          const carts: any[] = []

          for (let i = 0; i < tourCapacity; i++) {
            const cart = await createCartWithTour(`exact${i}@test.com`)
            carts.push(cart)
          }

          // Execute all completions concurrently
          const results = await Promise.allSettled(
            carts.map((cart) =>
              completeCartWithToursWorkflow(container).run({
                input: {
                  cart_id: cart.id,
                },
              })
            )
          )

          // All should succeed
          const successful = results.filter(
            (r) => r.status === "fulfilled"
          ).length
          expect(successful).toBe(tourCapacity)

          // Verify capacity is now 0
          const finalCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(finalCapacity).toBe(0)
        })

        it("should reject all bookings when capacity is already full", async () => {
          // First, fill up the capacity
          const initialCarts: any[] = []
          for (let i = 0; i < tourCapacity; i++) {
            const cart = await createCartWithTour(`initial${i}@test.com`)
            initialCarts.push(cart)
          }

          // Complete all initial bookings sequentially to fill capacity
          for (const cart of initialCarts) {
            await completeCartWithToursWorkflow(container).run({
              input: {
                cart_id: cart.id,
              },
            })
          }

          // Verify capacity is 0
          const capacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(capacity).toBe(0)

          // Now try to book more (should all fail)
          const extraCarts: any[] = []
          for (let i = 0; i < 3; i++) {
            const cart = await createCartWithTour(`extra${i}@test.com`)
            extraCarts.push(cart)
          }

          const results = await Promise.allSettled(
            extraCarts.map((cart) =>
              completeCartWithToursWorkflow(container).run({
                input: {
                  cart_id: cart.id,
                },
              })
            )
          )

          // All should fail
          const failed = results.filter((r) => r.status === "rejected").length
          expect(failed).toBe(3)
        })

        it("should maintain data consistency after concurrent bookings", async () => {
          const numberOfRequests = 8 // More than capacity
          const carts: any[] = []

          for (let i = 0; i < numberOfRequests; i++) {
            const cart = await createCartWithTour(`consistency${i}@test.com`)
            carts.push(cart)
          }

          // Execute concurrently
          await Promise.allSettled(
            carts.map((cart) =>
              completeCartWithToursWorkflow(container).run({
                input: {
                  cart_id: cart.id,
                },
              })
            )
          )

          // Query all bookings for the tour
          const { data: bookings } = await query.graph({
            entity: "tour_booking",
            fields: ["id", "tour_date", "status", "order_id"],
            filters: {
              tour_id: tour.id,
              tour_date: new Date(testDate),
            },
          })

          // Verify no duplicate order IDs
          const orderIds = bookings.map((b: any) => b.order_id)
          const uniqueOrderIds = new Set(orderIds)
          expect(uniqueOrderIds.size).toBe(orderIds.length)

          // Verify total active bookings doesn't exceed capacity
          const activeBookings = bookings.filter(
            (b: any) => b.status === "confirmed" || b.status === "pending"
          )
          expect(activeBookings.length).toBeLessThanOrEqual(tourCapacity)
        })
      })

      describe("Lock Mechanism Verification", () => {
        it("should generate correct lock keys for tours", () => {
          const tourId = "tour_123"
          const date = "2026-03-15"
          const lockKey = generateTourLockKey(tourId, date)

          expect(lockKey).toBe(`tour:${tourId}:${date}`)
          expect(lockKey).toContain(tourId)
          expect(lockKey).toContain(date)
        })

        it("should produce different lock keys for different tours", () => {
          const date = "2026-03-15"
          const key1 = generateTourLockKey("tour_1", date)
          const key2 = generateTourLockKey("tour_2", date)

          expect(key1).not.toBe(key2)
        })

        it("should produce different lock keys for different dates", () => {
          const tourId = "tour_123"
          const key1 = generateTourLockKey(tourId, "2026-03-15")
          const key2 = generateTourLockKey(tourId, "2026-03-16")

          expect(key1).not.toBe(key2)
        })
      })

      describe("Booking Validation", () => {
        it("should validate booking with available capacity", async () => {
          const validation = await tourModuleService.validateBooking(
            tour.id,
            new Date(testDate),
            2
          )

          expect(validation.valid).toBe(true)
          expect(validation.reason).toBeUndefined()
        })

        it("should reject booking exceeding available capacity", async () => {
          // First fill some capacity
          const cart = await createCartWithTour("fill@test.com")
          await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          // Now try to book more than remaining
          const validation = await tourModuleService.validateBooking(
            tour.id,
            new Date(testDate),
            tourCapacity // Trying to book 5 when only 4 remain
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("Only")
          expect(validation.reason).toContain("available")
        })

        it("should reject booking for unavailable dates", async () => {
          const unavailableDate = "2025-12-25"

          const validation = await tourModuleService.validateBooking(
            tour.id,
            new Date(unavailableDate),
            1
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("not available")
        })

        it("should reject booking for past dates", async () => {
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

      describe("Edge Cases", () => {
        it("should handle single passenger booking at capacity limit", async () => {
          // Create exactly capacity - 1 bookings first
          for (let i = 0; i < tourCapacity - 1; i++) {
            const cart = await createCartWithTour(`edge${i}@test.com`)
            await completeCartWithToursWorkflow(container).run({
              input: {
                cart_id: cart.id,
              },
            })
          }

          // Verify one spot left
          const capacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(capacity).toBe(1)

          // This booking should succeed
          const finalCart = await createCartWithTour("final@test.com")
          const result = await completeCartWithToursWorkflow(container).run({
            input: {
              cart_id: finalCart.id,
            },
          })

          expect(result).toBeDefined()

          // Verify capacity is now 0
          const finalCapacity = await tourModuleService.getAvailableCapacity(
            tour.id,
            new Date(testDate)
          )
          expect(finalCapacity).toBe(0)
        })

        it("should handle concurrent bookings with mixed passenger counts", async () => {
          // This test creates carts with different passenger counts
          // and verifies the system correctly calculates capacity

          // Create custom carts with 2 passengers each
          const customCarts: any[] = []

          for (let i = 0; i < 3; i++) {
            const customer = await customerModule.createCustomers({
              email: `mixed${i}@test.com`,
              first_name: "Test",
              last_name: "Customer",
            })

            const adultVariant = product.variants.find(
              (v: any) => v.title === "Adult Ticket"
            )

            const cart = await cartModule.createCarts({
              currency_code: "usd",
              email: `mixed${i}@test.com`,
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
              items: [
                {
                  variant_id: adultVariant.id,
                  quantity: 1,
                  unit_price: 200,
                  title: `${tour.destination} - ${testDate}`,
                  metadata: {
                    is_tour: true,
                    tour_id: tour.id,
                    tour_date: testDate,
                    tour_destination: tour.destination,
                    tour_duration_days: tour.duration_days,
                    total_passengers: 2, // 2 passengers
                    passengers: {
                      adults: 2,
                      children: 0,
                      infants: 0,
                    },
                  },
                },
              ],
            })

            await cartModule.addShippingMethod({
              cart_id: cart.id,
              option_id: shippingOption.id,
            })

            customCarts.push(cart)
          }

          // Execute all 3 carts concurrently (3 x 2 passengers = 6, but capacity is 5)
          const results = await Promise.allSettled(
            customCarts.map((cart) =>
              completeCartWithToursWorkflow(container).run({
                input: {
                  cart_id: cart.id,
                },
              })
            )
          )

          // At most 2 should succeed (2 x 2 = 4 passengers, 3rd would be 6 > 5)
          const successful = results.filter(
            (r) => r.status === "fulfilled"
          ).length
          expect(successful).toBeLessThanOrEqual(2)
        })
      })
    })
  },
})
