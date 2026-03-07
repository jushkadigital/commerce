import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow, createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows"
import { PACKAGE_MODULE } from "../../src/modules/package"
import PackageModuleService from "../../src/modules/package/service"
import completeCartWithPackagesWorkflow from "../../src/workflows/create-package-booking"
import { PassengerType } from "../../src/modules/package/models/package-variant"

jest.setTimeout(120 * 1000)

/**
 * Integration tests for package purchase flow
 * 
 * These tests verify the complete E2E flow for tourism packages:
 * 1. Create package with available dates
 * 2. Create cart with package item
 * 3. Add customer information
 * 4. Complete checkout (mock payment)
 * 5. Verify order created correctly
 * 6. Verify booking created in PackageModule
 * 
 * Note: Tourism packages don't use fulfillment/shipping as they are
 * experiences, not physical products that need delivery.
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Package Purchase Flow E2E", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let customerModule: any
      let orderModule: any
      let paymentModule: any
      let remoteLink: any
      let query: any
      let publishableApiKeyToken: string

      // Test data
      let pkg: any
      let product: any
      let region: any
      let salesChannel: any
      let productVariants: any[] = []
      const testDate = "2026-06-15"
      const packageCapacity = 10

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        customerModule = container.resolve(Modules.CUSTOMER)
        orderModule = container.resolve(Modules.ORDER)
        paymentModule = container.resolve(Modules.PAYMENT)
        remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
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
          payment_providers: ["pp_system_default"],
        })

        // Create product for the package
        product = await productModule.createProducts({
          title: "Cusco Adventure Package",
          description: "Amazing 3-day adventure package in Cusco",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [
            {
              title: "Passenger Type",
              values: ["Adult", "Child", "Infant"]
            }
          ]
        })

        // Create package with capacity
        pkg = await packageModuleService.createPackages({
          product_id: product.id,
          destination: "Cusco",
          description: "3-day adventure package in Cusco",
          duration_days: 3,
          thumbnail: "https://example.com/cusco-package-thumb.jpg",
          max_capacity: packageCapacity,
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
              "Passenger Type": type.charAt(0).toUpperCase() + type.slice(1),
            },
            manage_inventory: false,
            allow_backorder: true,
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

        // Create publishable API key for store endpoints
        const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
          container
        ).run({
          input: {
            api_keys: [
              {
                title: `package-store-api-${Date.now()}`,
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
          if (!packageModuleService || !pkg) {
            return
          }

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

      /**
       * Helper function to create a cart with package items
       */
      async function createCartWithPackage(
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
            unit_price: 100 * passengerCounts.adults,
            title: `${pkg.destination} - ${testDate} (Adults)`,
            metadata: {
              is_package: true,
              package_id: pkg.id,
              package_date: testDate,
              package_destination: pkg.destination,
              package_duration_days: pkg.duration_days,
              total_passengers: passengerCounts.adults,
              passengers: {
                adults: passengerCounts.adults,
                children: 0,
                infants: 0,
              },
              group_id: `package-${pkg.id}-${testDate}`,
              pricing_breakdown: [
                {
                  type: "ADULT",
                  quantity: passengerCounts.adults,
                  unit_price: 100,
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
            unit_price: 70 * passengerCounts.children,
            title: `${pkg.destination} - ${testDate} (Children)`,
            metadata: {
              is_package: true,
              package_id: pkg.id,
              package_date: testDate,
              package_destination: pkg.destination,
              package_duration_days: pkg.duration_days,
              total_passengers: passengerCounts.children,
              passengers: {
                adults: 0,
                children: passengerCounts.children,
                infants: 0,
              },
              group_id: `package-${pkg.id}-${testDate}`,
              pricing_breakdown: [
                {
                  type: "CHILD",
                  quantity: passengerCounts.children,
                  unit_price: 70,
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
            title: `${pkg.destination} - ${testDate} (Infants)`,
            metadata: {
              is_package: true,
              package_id: pkg.id,
              package_date: testDate,
              package_destination: pkg.destination,
              package_duration_days: pkg.duration_days,
              total_passengers: passengerCounts.infants,
              passengers: {
                adults: 0,
                children: 0,
                infants: passengerCounts.infants,
              },
              group_id: `package-${pkg.id}-${testDate}`,
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

        // Create cart - tourism packages don't need shipping/fulfillment
        const cart = await cartModule.createCarts({
          currency_code: "usd",
          email: customerEmail,
          customer_id: customer.id,
          sales_channel_id: salesChannel.id,
          region_id: region.id,
          items,
        })

        // Create payment collection for cart
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
          const initialCapacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(packageCapacity)

          const { cart, totalPassengers } = await createCartWithPackage(
            "test@example.com",
            { adults: 1, children: 0, infants: 0 }
          )

          expect(cart).toBeDefined()
          expect(cart.items).toHaveLength(1)
          expect(cart.items[0].metadata.is_package).toBe(true)
          expect(cart.items[0].metadata.package_id).toBe(pkg.id)

          const { result } = await completeCartWithPackagesWorkflow(container).run({
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

          const bookings = await packageModuleService.listPackageBookings({
            package_id: pkg.id,
            package_date: new Date(testDate),
          })

          expect(bookings).toHaveLength(1)
          const booking = bookings[0]
          expect(booking.order_id).toBe(orderId)
          expect(booking.status).toBe("pending")

          const remainingCapacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(remainingCapacity).toBe(packageCapacity - 1)
        })

        it("should create booking with correct metadata", async () => {
          const { cart } = await createCartWithPackage("meta@example.com", { adults: 3, children: 0, infants: 0 })

          const { result } = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = (result as any).order.id

          const { data: bookings } = await query.graph({
            entity: "package_booking",
            fields: ["id", "order_id", "package_date", "status", "line_items", "metadata"],
            filters: {
              order_id: orderId,
            },
          })

          expect(bookings).toHaveLength(1)
          const booking = bookings[0]
          const orderGroupId = (result as any).order.items?.[0]?.metadata?.group_id
          expect(booking.order_id).toBe(orderId)
          expect(booking.status).toBe("pending")
          expect(new Date(booking.package_date).toISOString().split("T")[0]).toBe(testDate)
          expect(typeof booking.metadata?.group_id).toBe("string")
          expect(booking.metadata?.group_id).toBe(orderGroupId)
        })

        it("should handle multiple packages in same cart", async () => {
          // Create a second package
          const product2 = await productModule.createProducts({
            title: "Lima City Package",
            description: "Lima city tour package",
            status: "published",
            sales_channels: [{ id: salesChannel.id }],
            options: [
              {
                title: "Passenger Type",
                values: ["Adult", "Child", "Infant"],
              },
            ],
          })

          const pkg2 = await packageModuleService.createPackages({
            product_id: product2.id,
            destination: "Lima",
            description: "City tour package in Lima",
            duration_days: 1,
            max_capacity: 5,
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
              "Passenger Type": "Adult",
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
                  total_passengers: 1,
                  group_id: `package-${pkg.id}-${testDate}`,
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
                  total_passengers: 1,
                  group_id: `package-${pkg2.id}-${testDate}`,
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

        it("should complete full purchase flow for a single adult passenger", async () => {
          const initialCapacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(initialCapacity).toBe(packageCapacity)

          const { cart, totalPassengers } = await createCartWithPackage(
            "single-adult@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          expect(cart).toBeDefined()
          expect(cart.items).toHaveLength(1)
          expect(cart.items[0].metadata.is_package).toBe(true)
          expect(cart.items[0].metadata.package_id).toBe(pkg.id)

          const { result } = await completeCartWithPackagesWorkflow(container).run({
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
          await packageModuleService.updatePackages({
            id: pkg.id,
            blocked_dates: [testDate]
          })

          const { cart } = await createCartWithPackage(
            "blocked-date@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("not available")

          await packageModuleService.updatePackages({
            id: pkg.id,
            blocked_dates: []
          })
        })

        it("should reject booking for blocked weekday", async () => {
          const packageDateObj = new Date(testDate)
          const dayOfWeek = packageDateObj.getDay()

          await packageModuleService.updatePackages({
            id: pkg.id,
            blocked_week_days: [dayOfWeek.toString()]
          })

          const { cart } = await createCartWithPackage(
            "blocked-weekday@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("not available")

          await packageModuleService.updatePackages({
            id: pkg.id,
            blocked_week_days: []
          })
        })

        it("should reject booking when capacity is exceeded", async () => {
          for (let i = 0; i < packageCapacity; i++) {
            const { cart } = await createCartWithPackage(
              `capacity${i}@test.com`,
              { adults: 1, children: 0, infants: 0 }
            )
            await completeCartWithPackagesWorkflow(container).run({
              input: { cart_id: cart.id },
            })
            
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          const { cart } = await createCartWithPackage(
            "exceed-capacity@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("spots available")
        })

        it("should reject booking when min months ahead not met", async () => {
          await packageModuleService.updatePackages({
            id: pkg.id,
            booking_min_months_ahead: 12
          })

          const { cart } = await createCartWithPackage(
            "min-months@test.com",
            { adults: 1, children: 0, infants: 0 }
          )

          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("months in advance")

          await packageModuleService.updatePackages({
            id: pkg.id,
            booking_min_months_ahead: 0
          })
        })

        it("should reject booking for past dates", async () => {
          const pastDate = "2020-01-01"

          const customers = await customerModule.listCustomers({
            email: "past-date@test.com",
          })
          let customer = customers[0] || await customerModule.createCustomers({
            email: "past-date@test.com",
            first_name: "Test",
            last_name: "Customer",
          })

          const adultVariant = product.variants.find(
            (v: any) => v.title === "Adult Ticket"
          )

          const cart = await cartModule.createCarts({
            currency_code: "usd",
            email: "past-date@test.com",
            customer_id: customer.id,
            sales_channel_id: salesChannel.id,
            region_id: region.id,
            items: [{
              variant_id: adultVariant.id,
              quantity: 1,
              unit_price: 100,
              title: `${pkg.destination} - ${pastDate}`,
              metadata: {
                is_package: true,
                package_id: pkg.id,
                package_date: pastDate,
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

          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
          expect(errors[0].error.message).toContain("past dates")
        })
      })

      describe("Capacity Validation", () => {
        it("should validate capacity before allowing checkout", async () => {
          for (let i = 0; i < packageCapacity; i++) {
            const { cart } = await createCartWithPackage(`fill${i}@test.com`, { adults: 1, children: 0, infants: 0 })
            await completeCartWithPackagesWorkflow(container).run({
              input: { cart_id: cart.id },
            })
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          const capacity = await packageModuleService.getAvailableCapacity(
            pkg.id,
            new Date(testDate)
          )
          expect(capacity).toBe(0)

          const { cart } = await createCartWithPackage("extra@test.com", { adults: 1, children: 0, infants: 0 })

          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: { cart_id: cart.id },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
        })
      })

      describe("Order and Booking Link", () => {
        it("should create link between order and package booking", async () => {
          const { cart } = await createCartWithPackage("link@example.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = (result as any).order.id

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
          const { cart } = await createCartWithPackage("totals@example.com", { adults: 3, children: 0, infants: 0 })

          const { result } = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const order = (result as any).order

          expect(order.items).toBeDefined()
          expect(order.items!.length).toBeGreaterThan(0)
          expect(order.total).toBeGreaterThan(0)
          expect(order.subtotal).toBeGreaterThan(0)
        })
      })

      describe("Error Handling", () => {
        it("should handle invalid cart id gracefully", async () => {
          const { errors } = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: "invalid_cart_id",
            },
            throwOnError: false,
          })

          expect(errors.length).toBeGreaterThan(0)
        })

        it("should validate booking for a valid future date with available capacity", async () => {
          const futureDate = "2030-12-25"

          const validation = await packageModuleService.validateBooking(
            pkg.id,
            new Date(futureDate),
            1
          )

          expect(validation.valid).toBe(true)
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
          const { cart } = await createCartWithPackage("pending@example.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = (result as any).order.id

          const bookings = await packageModuleService.listPackageBookings({
            order_id: orderId,
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].status).toBe("pending")
        })

        it("should allow updating booking status", async () => {
          const { cart } = await createCartWithPackage("update@example.com", { adults: 1, children: 0, infants: 0 })

          const { result } = await completeCartWithPackagesWorkflow(container).run({
            input: {
              cart_id: cart.id,
            },
          })

          const orderId = (result as any).order.id

          const bookings = await packageModuleService.listPackageBookings({
            order_id: orderId,
          })

          await packageModuleService.updatePackageBookings({
            id: bookings[0].id,
            status: "confirmed",
          })

          const updated = await packageModuleService.retrievePackageBooking(bookings[0].id)
          expect(updated.status).toBe("confirmed")
        })
      })
    })
  },
})
