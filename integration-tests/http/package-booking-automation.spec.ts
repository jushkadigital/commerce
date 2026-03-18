import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PACKAGE_MODULE } from "../../src/modules/package"
import type PackageModuleService from "../../src/modules/package/service"
import handlePackageOrderPlaced from "../../src/subscribers/package-order-placed"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("Package Booking Automation - order.placed Subscriber", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let orderModule: any
      let query: any

      let pkg: any
      let secondPackage: any
      let product: any
      let secondProduct: any
      let salesChannel: any
      let region: any

      const testDate = "2026-03-15"
      const testDateISO = "2026-03-15T10:00:00.000Z"

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        cartModule = container.resolve(Modules.CART)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        regionModule = container.resolve(Modules.REGION)
        orderModule = container.resolve(Modules.ORDER)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Automation Test Channel",
        })

        region = await regionModule.createRegions({
          name: "Automation Test Region",
          currency_code: "usd",
          countries: ["us"],
        })

        product = await productModule.createProducts({
          title: "Machu Picchu Package",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Passenger Type", values: ["Adult"] }],
        })

        pkg = await packageModuleService.createPackages({
          product_id: product.id,
          slug: `package-machu-picchu-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          destination: "Machu Picchu",
          description: "Full day package to Machu Picchu",
          duration_days: 1,
          max_capacity: 20,
        })
      })

      afterEach(async () => {
        try {
          const bookings = await packageModuleService.listPackageBookings({})
          if (bookings.length > 0) {
            await packageModuleService.deletePackageBookings(bookings.map((b) => b.id))
          }

          if (secondPackage) {
            await packageModuleService.deletePackages(secondPackage.id)
            secondPackage = null
          }
          await packageModuleService.deletePackages(pkg.id)

          if (secondProduct) {
            await productModule.deleteProducts(secondProduct.id)
            secondProduct = null
          }
          await productModule.deleteProducts(product.id)
          await regionModule.deleteRegions(region.id)
          await salesChannelModule.deleteSalesChannels(salesChannel.id)
        } catch (error) {
        }
      })

      async function createOrderWithPackageItems(
        email: string,
        packageItems: Array<{
          packageId: string
          packageDate: string
          passengers: Array<{ name: string; type: string; passport?: string }>
        }>,
        orderMetadata?: Record<string, unknown>
      ) {
        const adultVariant = await productModule.createProductVariants({
          product_id: product.id,
          title: `Adult Ticket ${Date.now()}`,
          sku: `AUTO-ADULT-${Date.now()}`,
          manage_inventory: false,
          options: { "Passenger Type": "Adult" },
        })

        const items = packageItems.map((pi) => ({
          variant_id: adultVariant.id,
          quantity: 1,
          unit_price: 150,
          title: `Package - ${pi.packageDate}`,
          metadata: {
            is_package: true,
            package_id: pi.packageId,
            package_date: pi.packageDate,
            passengers: pi.passengers,
          },
        }))

        const order = await orderModule.createOrders({
          currency_code: "usd",
          email,
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          metadata: orderMetadata,
          items: items.map((item) => ({
            title: item.title,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            metadata: item.metadata,
          })),
        })

        return order
      }

      async function createOrderWithoutPackageItems(email: string) {
        const plainVariant = await productModule.createProductVariants({
          product_id: product.id,
          title: `Regular Item ${Date.now()}`,
          sku: `REGULAR-${Date.now()}`,
          manage_inventory: false,
          options: { "Passenger Type": "Adult" },
        })

        const order = await orderModule.createOrders({
          currency_code: "usd",
          email,
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          items: [
            {
              title: "Regular Product",
              variant_id: plainVariant.id,
              quantity: 2,
              unit_price: 50,
            },
          ],
        })

        return order
      }

      async function triggerOrderPlaced(orderId: string) {
        await handlePackageOrderPlaced({
          event: { data: { id: orderId }, name: "order.placed" },
          container,
        } as any)
      }

      describe("Automatic PackageBooking Creation", () => {
        it("should create PackageBooking when order.placed event fires with package metadata", async () => {
          const passengers = [
            { name: "Maria Garcia", type: "adult", passport: "PE12345678" },
          ]

          const preData = {
            source: "checkout-web",
            traveler: {
              document: "DNI",
              city: "Lima",
            },
          }

          const order = await createOrderWithPackageItems("booking@test.com", [
            { packageId: pkg.id, packageDate: testDate, passengers },
          ], { preData })

          await triggerOrderPlaced(order.id)

          const bookings = await packageModuleService.listPackageBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].order_id).toBe(order.id)
          expect(bookings[0].package_id).toBe(pkg.id)
          expect(new Date(bookings[0].package_date).toISOString().split("T")[0]).toBe(testDate)
          expect(bookings[0].status).toBe("pending")
          expect(bookings[0].line_items).toBeDefined()
          expect((bookings[0].metadata as any)?.preData).toEqual(preData)

          const lineItems = bookings[0].line_items as any
          expect(lineItems.passengers).toEqual(passengers)
        })

        it("should NOT create PackageBooking when order has no package items", async () => {
          const order = await createOrderWithoutPackageItems("nopackage@test.com")

          await triggerOrderPlaced(order.id)

          const bookings = await packageModuleService.listPackageBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(0)
        })
      })

      describe("Idempotency", () => {
        it("should prevent duplicate bookings when subscriber fires twice for same order", async () => {
          const passengers = [
            { name: "Carlos Ruiz", type: "adult", passport: "PE99887766" },
          ]

          const order = await createOrderWithPackageItems("idempotent@test.com", [
            { packageId: pkg.id, packageDate: testDate, passengers },
          ])

          await triggerOrderPlaced(order.id)
          await triggerOrderPlaced(order.id)

          const bookings = await packageModuleService.listPackageBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(1)
        })
      })

      describe("Multiple Package Items", () => {
        it("should create separate bookings for each package item in one order", async () => {
          secondProduct = await productModule.createProducts({
            title: "Sacred Valley Package",
            status: "published",
            sales_channels: [{ id: salesChannel.id }],
            options: [{ title: "Passenger Type", values: ["Adult"] }],
          })

          secondPackage = await packageModuleService.createPackages({
            product_id: secondProduct.id,
            slug: `package-sacred-valley-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
            destination: "Sacred Valley",
            description: "Full day Sacred Valley package",
            duration_days: 1,
            max_capacity: 15,
          })

          const passengersA = [
            { name: "Ana Torres", type: "adult", passport: "PE11112222" },
          ]
          const passengersB = [
            { name: "Luis Mendez", type: "adult", passport: "PE33334444" },
            { name: "Sofia Mendez", type: "child" },
          ]

          const order = await createOrderWithPackageItems("multi@test.com", [
            { packageId: pkg.id, packageDate: testDate, passengers: passengersA },
            { packageId: secondPackage.id, packageDate: "2026-03-20", passengers: passengersB },
          ])

          await triggerOrderPlaced(order.id)

          const bookings = await packageModuleService.listPackageBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(2)

          const bookingForPackage1 = bookings.find((b) => b.package_id === pkg.id)
          const bookingForPackage2 = bookings.find((b) => b.package_id === secondPackage.id)

          expect(bookingForPackage1).toBeDefined()
          expect(bookingForPackage2).toBeDefined()
          expect(bookingForPackage1!.status).toBe("pending")
          expect(bookingForPackage2!.status).toBe("pending")

          const lineItems1 = bookingForPackage1!.line_items as any
          const lineItems2 = bookingForPackage2!.line_items as any
          expect(lineItems1.passengers).toHaveLength(1)
          expect(lineItems2.passengers).toHaveLength(2)
        })
      })

      describe("Email Dispatch Integration", () => {
        it("should log booking creation count after processing package order", async () => {
          const logger = container.resolve("logger")
          const logSpy = jest.spyOn(logger, "info")

          const passengers = [
            { name: "Elena Vargas", type: "adult", passport: "PE55556666" },
          ]

          const order = await createOrderWithPackageItems("email-log@test.com", [
            { packageId: pkg.id, packageDate: testDate, passengers },
          ])

          await triggerOrderPlaced(order.id)

          const creationLogCall = logSpy.mock.calls.find(
            (call) =>
              typeof call[0] === "string" &&
              call[0].includes("Created") &&
              call[0].includes("package booking(s)")
          )

          expect(creationLogCall).toBeDefined()
          expect(creationLogCall![0]).toContain("Created 1 package booking(s)")
          expect(creationLogCall![0]).toContain(order.id)

          logSpy.mockRestore()
        })
      })
    })
  },
})
