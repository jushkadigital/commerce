import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../src/modules/tour"
import { PACKAGE_MODULE } from "../../src/modules/package"
import type TourModuleService from "../../src/modules/tour/service"
import type PackageModuleService from "../../src/modules/package/service"
import { GET as getTourBookings } from "../../src/api/admin/bookings/route"
import { GET as getPackageBookings } from "../../src/api/admin/package-bookings/route"

jest.setTimeout(120 * 1000)

type MockRes = {
  statusCode: number
  body: any
  status: (code: number) => MockRes
  json: (payload: any) => MockRes
}

const createMockRes = (): MockRes => {
  const res = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
  }

  return res
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("Admin bookings routes (tour + package)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let packageModuleService: PackageModuleService
      let productModule: any
      let regionModule: any
      let salesChannelModule: any
      let orderModule: any

      let salesChannel: any
      let region: any
      let tourProduct: any
      let packageProduct: any
      let tourVariant: any
      let packageVariant: any
      let tour: any
      let pkg: any
      let order: any
      let tourBookingId: string | null = null
      let packageBookingId: string | null = null

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        regionModule = container.resolve(Modules.REGION)
        salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
        orderModule = container.resolve(Modules.ORDER)
      })

      beforeEach(async () => {
        salesChannel = await salesChannelModule.createSalesChannels({
          name: "Admin Bookings Channel",
        })

        region = await regionModule.createRegions({
          name: "Admin Bookings Region",
          currency_code: "usd",
          countries: ["us"],
        })

        tourProduct = await productModule.createProducts({
          title: "Tour Product",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Passenger Type", values: ["Adult"] }],
        })

        packageProduct = await productModule.createProducts({
          title: "Package Product",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Passenger Type", values: ["Adult"] }],
        })

        tourVariant = await productModule.createProductVariants({
          product_id: tourProduct.id,
          title: `Tour Variant ${Date.now()}`,
          sku: `TOUR-BOOKINGS-${Date.now()}`,
          manage_inventory: false,
          options: { "Passenger Type": "Adult" },
        })

        packageVariant = await productModule.createProductVariants({
          product_id: packageProduct.id,
          title: `Package Variant ${Date.now()}`,
          sku: `PACKAGE-BOOKINGS-${Date.now()}`,
          manage_inventory: false,
          options: { "Passenger Type": "Adult" },
        })

        tour = await tourModuleService.createTours({
          product_id: tourProduct.id,
          destination: "Cusco",
          description: "Tour for admin bookings test",
          duration_days: 1,
          max_capacity: 20,
        })

        pkg = await packageModuleService.createPackages({
          product_id: packageProduct.id,
          destination: "Lima",
          description: "Package for admin bookings test",
          duration_days: 2,
          max_capacity: 15,
        })

        order = await orderModule.createOrders({
          currency_code: "usd",
          email: "admin-bookings@test.com",
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          items: [
            {
              title: "Order item",
              variant_id: tourVariant.id,
              quantity: 1,
              unit_price: 100,
            },
          ],
        })

        const createdTourBooking = await tourModuleService.createTourBookings({
          order_id: order.id,
          tour_id: tour.id,
          tour_date: new Date("2026-04-01T10:00:00.000Z"),
          line_items: {
            passengers: [{ name: "Alice", type: "adult" }],
          },
          status: "pending",
        })

        const createdPackageBooking = await packageModuleService.createPackageBookings({
          order_id: order.id,
          package_id: pkg.id,
          package_date: new Date("2026-04-05T10:00:00.000Z"),
          line_items: {
            passengers: [{ name: "Bob", type: "adult" }],
          },
          status: "pending",
        })

        tourBookingId = Array.isArray(createdTourBooking)
          ? createdTourBooking[0]?.id
          : (createdTourBooking as any)?.id
        packageBookingId = Array.isArray(createdPackageBooking)
          ? createdPackageBooking[0]?.id
          : (createdPackageBooking as any)?.id
      })

      afterEach(async () => {
        try {
          if (tourBookingId) {
            await tourModuleService.deleteTourBookings([tourBookingId])
          }
          if (packageBookingId) {
            await packageModuleService.deletePackageBookings([packageBookingId])
          }

          if (tour?.id) {
            await tourModuleService.deleteTours(tour.id)
          }
          if (pkg?.id) {
            await packageModuleService.deletePackages(pkg.id)
          }

          if (tourVariant?.id) {
            await productModule.deleteProductVariants(tourVariant.id)
          }
          if (packageVariant?.id) {
            await productModule.deleteProductVariants(packageVariant.id)
          }

          if (tourProduct?.id) {
            await productModule.deleteProducts(tourProduct.id)
          }
          if (packageProduct?.id) {
            await productModule.deleteProducts(packageProduct.id)
          }

          if (region?.id) {
            await regionModule.deleteRegions(region.id)
          }
          if (salesChannel?.id) {
            await salesChannelModule.deleteSalesChannels(salesChannel.id)
          }
        } catch (error) {
        }

        tourBookingId = null
        packageBookingId = null
      })

      it("GET /admin/bookings should return tour bookings filtered by order_id", async () => {
        const req = {
          scope: container,
          filterableFields: {
            order_id: order.id,
          },
          queryConfig: {
            fields: ["id", "order_id", "tour_id", "tour_date", "status"],
          },
        } as any

        const res = createMockRes()

        await getTourBookings(req, res as any)

        expect(res.statusCode).toBe(200)
        expect(Array.isArray(res.body?.tours_booking)).toBe(true)
        expect(res.body?.type).toBe("tour")
        expect(res.body?.tours_booking?.length).toBeGreaterThan(0)
        expect(res.body?.tours_booking?.[0]?.order_id).toBe(order.id)
      })

      it("GET /admin/package-bookings should return package bookings filtered by order_id", async () => {
        const req = {
          scope: container,
          filterableFields: {
            order_id: order.id,
          },
          queryConfig: {
            fields: ["id", "order_id", "package_id", "package_date", "status"],
          },
        } as any

        const res = createMockRes()

        await getPackageBookings(req, res as any)

        expect(res.statusCode).toBe(200)
        expect(Array.isArray(res.body?.packages_booking)).toBe(true)
        expect(res.body?.packages_booking?.length).toBeGreaterThan(0)
        expect(res.body?.packages_booking?.[0]?.order_id).toBe(order.id)
      })
    })
  },
})
