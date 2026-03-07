import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TOUR_MODULE, PassengerType } from "../../src/modules/tour"
import type TourModuleService from "../../src/modules/tour/service"
import handleOrderPlaced from "../../src/subscribers/order-placed"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("Tour Booking Automation - order.placed Subscriber", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let cartModule: any
      let salesChannelModule: any
      let regionModule: any
      let orderModule: any
      let query: any

      let tour: any
      let secondTour: any
      let product: any
      let secondProduct: any
      let salesChannel: any
      let region: any

      const testDate = "2026-03-15"
      const testDateISO = "2026-03-15T10:00:00.000Z"

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
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
          title: "Machu Picchu Tour",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Passenger Type", values: ["Adult"] }],
        })

        tour = await tourModuleService.createTours({
          product_id: product.id,
          destination: "Machu Picchu",
          description: "Full day tour to Machu Picchu",
          duration_days: 1,
          max_capacity: 20,
        })
      })

      afterEach(async () => {
        try {
          const bookings = await tourModuleService.listTourBookings({})
          if (bookings.length > 0) {
            await tourModuleService.deleteTourBookings(bookings.map((b) => b.id))
          }

          if (secondTour) {
            await tourModuleService.deleteTours(secondTour.id)
            secondTour = null
          }
          await tourModuleService.deleteTours(tour.id)

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

      async function createOrderWithTourItems(
        email: string,
        tourItems: Array<{
          tourId: string
          tourDate: string
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

        const items = tourItems.map((ti) => ({
          variant_id: adultVariant.id,
          quantity: 1,
          unit_price: 150,
          title: `Tour - ${ti.tourDate}`,
          metadata: {
            is_tour: true,
            tour_id: ti.tourId,
            tour_date: ti.tourDate,
            passengers: ti.passengers,
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

      async function createOrderWithoutTourItems(email: string) {
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
        await handleOrderPlaced({
          event: { data: { id: orderId }, name: "order.placed" },
          container,
        } as any)
      }

      describe("Automatic TourBooking Creation", () => {
        it("should create TourBooking when order.placed event fires with tour metadata", async () => {
          const passengers = [
            { name: "Maria Garcia", type: "adult", passport: "PE12345678" },
          ]

          const preData = {
            source: "checkout-web",
            traveler: {
              document: "DNI",
              city: "Cusco",
            },
          }

          const order = await createOrderWithTourItems("booking@test.com", [
            { tourId: tour.id, tourDate: testDate, passengers },
          ], { preData })

          await triggerOrderPlaced(order.id)

          const bookings = await tourModuleService.listTourBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(1)
          expect(bookings[0].order_id).toBe(order.id)
          expect(bookings[0].tour_id).toBe(tour.id)
          expect(new Date(bookings[0].tour_date).toISOString().split("T")[0]).toBe(testDate)
          expect(bookings[0].status).toBe("pending")
          expect(bookings[0].line_items).toBeDefined()
          expect((bookings[0].metadata as any)?.preData).toEqual(preData)

          const lineItems = bookings[0].line_items as any
          expect(lineItems.passengers).toEqual(passengers)
        })

        it("should NOT create TourBooking when order has no tour items", async () => {
          const order = await createOrderWithoutTourItems("notour@test.com")

          await triggerOrderPlaced(order.id)

          const bookings = await tourModuleService.listTourBookings({
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

          const order = await createOrderWithTourItems("idempotent@test.com", [
            { tourId: tour.id, tourDate: testDate, passengers },
          ])

          await triggerOrderPlaced(order.id)
          await triggerOrderPlaced(order.id)

          const bookings = await tourModuleService.listTourBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(1)
        })
      })

      describe("Multiple Tour Items", () => {
        it("should create separate bookings for each tour item in one order", async () => {
          secondProduct = await productModule.createProducts({
            title: "Sacred Valley Tour",
            status: "published",
            sales_channels: [{ id: salesChannel.id }],
            options: [{ title: "Passenger Type", values: ["Adult"] }],
          })

          secondTour = await tourModuleService.createTours({
            product_id: secondProduct.id,
            destination: "Sacred Valley",
            description: "Full day Sacred Valley tour",
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

          const order = await createOrderWithTourItems("multi@test.com", [
            { tourId: tour.id, tourDate: testDate, passengers: passengersA },
            { tourId: secondTour.id, tourDate: "2026-03-20", passengers: passengersB },
          ])

          await triggerOrderPlaced(order.id)

          const bookings = await tourModuleService.listTourBookings({
            order_id: order.id,
          })

          expect(bookings).toHaveLength(2)

          const bookingForTour1 = bookings.find((b) => b.tour_id === tour.id)
          const bookingForTour2 = bookings.find((b) => b.tour_id === secondTour.id)

          expect(bookingForTour1).toBeDefined()
          expect(bookingForTour2).toBeDefined()
          expect(bookingForTour1!.status).toBe("pending")
          expect(bookingForTour2!.status).toBe("pending")

          const lineItems1 = bookingForTour1!.line_items as any
          const lineItems2 = bookingForTour2!.line_items as any
          expect(lineItems1.passengers).toHaveLength(1)
          expect(lineItems2.passengers).toHaveLength(2)
        })
      })

      describe("Email Dispatch Integration", () => {
        it("should log booking creation count after processing tour order", async () => {
          const logger = container.resolve("logger")
          const logSpy = jest.spyOn(logger, "info")

          const passengers = [
            { name: "Elena Vargas", type: "adult", passport: "PE55556666" },
          ]

          const order = await createOrderWithTourItems("email-log@test.com", [
            { tourId: tour.id, tourDate: testDate, passengers },
          ])

          await triggerOrderPlaced(order.id)

          const creationLogCall = logSpy.mock.calls.find(
            (call) =>
              typeof call[0] === "string" &&
              call[0].includes("Created") &&
              call[0].includes("tour booking(s)")
          )

          expect(creationLogCall).toBeDefined()
          expect(creationLogCall![0]).toContain("Created 1 tour booking(s)")
          expect(creationLogCall![0]).toContain(order.id)

          logSpy.mockRestore()
        })
      })
    })
  },
})
