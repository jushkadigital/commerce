import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { PACKAGE_MODULE } from "../../src/modules/package"
import PackageModuleService from "../../src/modules/package/service"
import completeCartWithPackagesWorkflow from "../../src/workflows/create-package-booking"
import { PassengerType } from "../../src/modules/package/models/package-variant"

jest.setTimeout(120 * 1000)

/**
 * Integration tests for package purchase flow
 * 
 * These tests verify the complete E2E flow:
 * 1. Create package with available dates
 * 2. Create cart with package item
 * 3. Add customer information
 * 4. Select shipping method
 * 5. Complete checkout (mock payment)
 * 6. Verify order created correctly
 * 7. Verify booking created in PackageModule
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Package Purchase Flow E2E", () => {
      let container: any
      let packageModuleService: PackageModuleService
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
      let pkg: any
      let product: any
      let region: any
      let salesChannel: any
      let shippingProfile: any
      let shippingOption: any
      let priceSet: any
      let productVariants: any[] = []
      const testDate = "2026-03-15"
      const packageCapacity = 10

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
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

        // Create product for the package
        product = await productModule.createProducts({
          title: "Cusco Adventure Package",
          description: "Amazing 3-day adventure package in Cusco",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
        })

        // Create package with capacity
        pkg = await packageModuleService.createPackages({
          product_id: product.id,
          destination: "Cusco",
          description: "3-day adventure package in Cusco",
          duration_days: 3,
          max_capacity: packageCapacity,
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
                amount: type === "adult" ? 100 : type === "child" ? 70 : 0,
              },
            ],
            options: {
              passenger_type: type,
            },
          })

          productVariants.push(variant)

          // Create package variant link
          await packageModuleService.createPackageVariants({
            package: pkg.id,
            variant_id: variant.id,
            passenger_type: type === "adult" ? PassengerType.ADULT : type === "child" ? PassengerType.CHILD : PassengerType.INFANT,
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
          const bookings = await packageModuleService.listPackageBookings({
            package_id: pkg.id,
          })
          if (bookings.length > 0) {
            await packageModuleService.deletePackageBookings(
              bookings.map((b) => b.id)
            )
          }

          await packageModuleService.deletePackageVariants({
            package_id: pkg.id,
          })

          await packageModuleService.deletePackages(pkg.id)

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
       * Helper function to create a cart with package items
       */
      async function createCartWithPackage(customerEmail: string, passengerCount: number = 1) {
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
              title: `${pkg.destination} - ${testDate}`,
              metadata: {
                is_package: true,
                package_id: pkg.id,
                package_date: testDate,
                package_destination: pkg.destination,
                package_duration_days: pkg.duration_days,
                total_passengers: passengerCount,
                passengers: {
                  adults: passengerCount,
                  children: 0,
                  infants: 0,
                },
                pricing_breakdown: [
                  {
                    type: "ADULT",
                    quantity: passengerCount,
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

      describe("Complete Purchase Flow", () => {
        it("should complete full purchase flow and create order and booking", async () => {
          // Verify initial capacity
          const initialCapacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(packageCapacity)

          // Create cart with package
          const customerEmail = "test@example.com"
          const cart = await createCartWithPackage(customerEmail, 2)

          expect(cart).toBeDefined()
          expect(cart.items).toHaveLength(1)
          expect(cart.items[0].metadata.is_package).toBe(true)
          expect(cart.items[0].metadata.package_id).toBe(pkg.id)

          // Complete checkout using workflow
          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          // Verify workflow returned order
          expect(result.result.order).toBeDefined()
          expect(result.result.order.id).toBeDefined()

          const orderId = result.result.order.id

          // Verify order was created in Order module
          const order = await orderModule.retrieveOrder(orderId)
          expect(order).toBeDefined()
          expect(order.email).toBe(customerEmail)
          expect(order.items).toHaveLength(1)

          // Verify package booking was created
          const bookings = await packageModuleService.listPackageBookings({
            package_id: pkg.id,
            package_date: new Date(testDate),
          })

          expect(bookings).toHaveLength(1)
          const booking = bookings[0]
          expect(booking.order_id).toBe(orderId)
          expect(booking.status).toBe("pending")

          // Verify capacity was reduced
          const remainingCapacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(packageCapacity - 2)
        })

        it("should create booking with correct metadata", async () => {
          const cart = await createCartWithPackage("meta@example.com", 3)

          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = result.result.order.id

          // Query booking with all details
          const { data: bookings } = await query.graph({
            entity: "package_booking",
            fields: ["id", "order_id", "package_date", "status", "line_items"],
            filters: {
              order_id: orderId,
            },
          })

          expect(bookings).toHaveLength(1)
          const booking = bookings[0]
          expect(booking.order_id).toBe(orderId)
          expect(booking.status).toBe("pending")
          expect(new Date(booking.package_date).toISOString().split("T")[0]).toBe(testDate)
        })

        it("should handle multiple packages in same cart", async () => {
          // Create a second package
          const product2 = await productModule.createProducts({
            title: "Lima City Package",
            description: "Lima city tour package",
            status: "published",
            sales_channels: [{ id: salesChannel.id }],
          })

          const pkg2 = await packageModuleService.createPackages({
            product_id: product2.id,
            destination: "Lima",
            description: "City tour package in Lima",
            duration_days: 1,
            max_capacity: 5,
            available_dates: [testDate],
          })

          // Create variant for second package
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
              passenger_type: "adult",
            },
          })

          await packageModuleService.createPackageVariants({
            package: pkg2.id,
            variant_id: variant2.id,
            passenger_type: PassengerType.ADULT,
          })

          // Get customer
          const customer = await customerModule.createCustomers({
            email: "multi@example.com",
            first_name: "Test",
            last_name: "Customer",
          })

          // Get adult variants for both packages
          const adultVariant1 = product.variants.find(
            (v: any) => v.title === "Adult Ticket"
          )

          // Create cart with both packages
          const cart = await cartModule.createCarts({
            currency_code: "usd",
            email: "multi@example.com",
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
                variant_id: adultVariant1.id,
                quantity: 1,
                unit_price: 100,
                title: `Cusco - ${testDate}`,
                metadata: {
                  is_package: true,
                  package_id: pkg.id,
                  package_date: testDate,
                },
              },
              {
                variant_id: variant2.id,
                quantity: 1,
                unit_price: 50,
                title: `Lima - ${testDate}`,
                metadata: {
                  is_package: true,
                  package_id: pkg2.id,
                  package_date: testDate,
                },
              },
            ],
          })

          await cartModule.addShippingMethod({
            cart_id: cart.id,
            option_id: shippingOption.id,
          })

          // Complete checkout
          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = result.result.order.id

          // Verify both bookings were created
          const bookings1 = await packageModuleService.listPackageBookings({
            package_id: pkg.id,
          })
          const bookings2 = await packageModuleService.listPackageBookings({
            package_id: pkg2.id,
          })

          expect(bookings1).toHaveLength(1)
          expect(bookings2).toHaveLength(1)
          expect(bookings1[0].order_id).toBe(orderId)
          expect(bookings2[0].order_id).toBe(orderId)

          // Cleanup
          await packageModuleService.deletePackageBookings(bookings2.map((b) => b.id))
          await packageModuleService.deletePackageVariants({ package_id: pkg2.id })
          await packageModuleService.deletePackages(pkg2.id)
          await productModule.deleteProductVariants(variant2.id)
          await productModule.deleteProducts(product2.id)
        })
      })

      describe("Capacity Validation", () => {
        it("should reject booking when capacity is exceeded", async () => {
          // Create carts for exactly capacity + 1 passengers
          const carts: any[] = []
          
          // Create carts that together exceed capacity
          for (let i = 0; i < packageCapacity + 1; i++) {
            const cart = await createCartWithPackage(`capacity${i}@test.com`, 1)
            carts.push(cart)
          }

          // Execute all checkouts
          const results = await Promise.allSettled(
            carts.map((cart) =>
              completeCartWithPackagesWorkflow(container).run({
                input: {
                  cart_id: cart.id,
                },
              })
            )
          )

          // Count successful bookings
          const successful = results.filter(
            (r) => r.status === "fulfilled"
          ).length

          // Should only allow up to capacity
          expect(successful).toBeLessThanOrEqual(packageCapacity)

          // Verify final bookings count
          const bookings = await packageModuleService.listPackageBookings({
            package_id: pkg.id,
            package_date: new Date(testDate),
          })

          const activeBookings = bookings.filter(
            (b) => b.status === "confirmed" || b.status === "pending"
          )
          expect(activeBookings.length).toBeLessThanOrEqual(packageCapacity)
        })

        it("should validate capacity before allowing checkout", async () => {
          // First fill up capacity
          for (let i = 0; i < packageCapacity; i++) {
            const cart = await createCartWithPackage(`fill${i}@test.com`, 1)
            await completeCartWithPackagesWorkflow(container).run({
              input: {
                cart_id: cart.id,
              },
            })
          }

          // Verify capacity is full
          const capacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(capacity).toBe(0)

          // Try to book one more - should fail
          const extraCart = await createCartWithPackage("extra@test.com", 1)
          
          await expect(
            completeCartWithPackagesWorkflow(container).run({
              input: {
                cart_id: extraCart.id,
              },
            })
          ).rejects.toThrow()
        })
      })

      describe("Order and Booking Link", () => {
        it("should create link between order and package booking", async () => {
          const cart = await createCartWithPackage("link@example.com", 1)

          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = result.result.order.id

          // Query through link
          const { data: linkedBookings } = await query.graph({
            entity: "package_booking_order",
            fields: ["package_booking.*", "order.*"],
            filters: {
              order_id: orderId,
            },
          })

          expect(linkedBookings).toHaveLength(1)
          expect(linkedBookings[0].order.id).toBe(orderId)
          expect(linkedBookings[0].package_booking.order_id).toBe(orderId)
        })

        it("should preserve order totals correctly", async () => {
          const passengerCount = 3
          const cart = await createCartWithPackage("totals@example.com", passengerCount)

          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const order = result.result.order

          // Verify order has items and totals
          expect(order.items).toBeDefined()
          expect(order.items!.length).toBeGreaterThan(0)
          expect(order.total).toBeGreaterThan(0)
          expect(order.subtotal).toBeGreaterThan(0)
        })
      })

      describe("Error Handling", () => {
        it("should handle invalid cart id gracefully", async () => {
          await expect(
            completeCartWithPackagesWorkflow(container).run({
              input: {
                cart_id: "invalid_cart_id",
              },
            })
          ).rejects.toThrow()
        })

        it("should validate booking date is available", async () => {
          const invalidDate = "2025-12-25" // Not in available_dates
          
          const validation = await packageModuleService.validateBooking(
            pkg.id,
            new Date(invalidDate),
            1
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("not available")
        })

        it("should validate booking date is not in the past", async () => {
          const pastDate = "2020-01-01"
          
          const validation = await packageModuleService.validateBooking(
            pkg.id,
            new Date(pastDate),
            1
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("past")
        })
      })

      describe("Booking Status Flow", () => {
        it("should create booking with pending status initially", async () => {
          const cart = await createCartWithPackage("pending@example.com", 1)

          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = result.result.order.id

          const bookings = await packageModuleService.listPackageBookings({
            order_id: orderId,
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].status).toBe("pending")
        })

        it("should allow updating booking status", async () => {
          const cart = await createCartWithPackage("update@example.com", 1)

          const result = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = result.result.order.id

          const bookings = await packageModuleService.listPackageBookings({
            order_id: orderId,
          })

          // Update status to confirmed
          await packageModuleService.updatePackageBookings({
            id: bookings[0].id,
            status: "confirmed",
          })

          // Verify status updated
          const updated = await packageModuleService.retrievePackageBooking(bookings[0].id)
          expect(updated.status).toBe("confirmed")
        })
      })
    })
  },
})
