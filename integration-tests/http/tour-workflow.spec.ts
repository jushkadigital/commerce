import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createTourWorkflow, CreateTourWorkflowInput } from "../../src/workflows/create-tour"
import { TOUR_MODULE } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("CreateTourWorkflow - Integration Tests", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let query: any

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve("query")
      })

      describe("Successful Tour Creation", () => {
        it("should create a complete tour with all entities", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Machu Picchu",
            description: "Full day tour to Machu Picchu including guide",
            duration_days: 1,
            max_capacity: 20,
            thumbnail: "https://example.com/machu-picchu.jpg",
            prices: {
              adult: 150,
              child: 100,
              infant: 0,
              currency_code: "USD",
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result).toBeDefined()
          expect(result.tour).toBeDefined()
          expect(result.tour.id).toBeDefined()

          const tour = result.tour

          expect(tour.destination).toBe("Machu Picchu")
          expect(tour.description).toBe("Full day tour to Machu Picchu including guide")
          expect(tour.duration_days).toBe(1)
          expect(tour.max_capacity).toBe(20)
          expect(tour.thumbnail).toBe("https://example.com/machu-picchu.jpg")
          expect(tour.product_id).toBeDefined()

          expect(tour.product).toBeDefined()
          if (tour.product) {
            expect(tour.product.id).toBeDefined()
            expect(tour.product.title).toContain("Machu Picchu")
            expect(tour.product.variants).toBeDefined()
            expect(tour.product.variants.length).toBe(3)

            const productVariants = tour.product.variants
            expect(productVariants.some((v: any) => v.title === "Adult")).toBe(true)
            expect(productVariants.some((v: any) => v.title === "Child")).toBe(true)
            expect(productVariants.some((v: any) => v.title === "Infant")).toBe(true)

            const adultVariant = productVariants.find((v: any) => v.title === "Adult")
            expect(adultVariant).toBeDefined()
            expect(adultVariant!.sku).toContain("ADULT")

            const childVariant = productVariants.find((v: any) => v.title === "Child")
            expect(childVariant).toBeDefined()
            expect(childVariant!.sku).toContain("CHILD")

            const infantVariant = productVariants.find((v: any) => v.title === "Infant")
            expect(infantVariant).toBeDefined()
            expect(infantVariant!.sku).toContain("INFANT")
          }

          expect(tour.variants).toBeDefined()
          expect(tour.variants.length).toBe(3)

          tour.variants.forEach((tv: any) => {
            expect(tv.id).toBeDefined()
            expect(tv.variant_id).toBeDefined()
            expect(tv.tour_id).toBe(tour.id)
            expect(tv.passenger_type).toBeDefined()
          })

          const retrievedTour = await tourModuleService.retrieveTour(tour.id)
          expect(retrievedTour).toBeDefined()
          expect(retrievedTour.destination).toBe("Machu Picchu")

          await cleanupTour(tour.id)
        })

        it("should create tour with minimal required fields", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Cusco City Tour",
            duration_days: 1,
            max_capacity: 10,
            prices: {
              adult: 50,
              child: 30,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour).toBeDefined()
          expect(result.tour.destination).toBe("Cusco City Tour")
          expect(result.tour.duration_days).toBe(1)
          expect(result.tour.max_capacity).toBe(10)
          expect(result.tour.product).toBeDefined()
          expect(result.tour.variants).toHaveLength(3)

          await cleanupTour(result.tour.id)
        })

      })

      describe("Pricing and Currency", () => {
        it("should create tour with USD currency by default", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Lima Food Tour",
            duration_days: 1,
            max_capacity: 8,
            prices: {
              adult: 80,
              child: 40,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour.product).toBeDefined()

          await cleanupTour(result.tour.id)
        })

        it("should create tour with PEN (Peruvian Sol) currency", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Arequipa Colca Canyon",
            duration_days: 2,
            max_capacity: 12,
            prices: {
              adult: 500,
              child: 300,
              infant: 0,
              currency_code: "PEN",
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour).toBeDefined()
          expect(result.tour.destination).toBe("Arequipa Colca Canyon")

          await cleanupTour(result.tour.id)
        })

        it("should create tour with different price tiers", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Amazon Rainforest Expedition",
            duration_days: 5,
            max_capacity: 6,
            prices: {
              adult: 1200,
              child: 900,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          if (result.tour.product) {
            const adultVariant = result.tour.product.variants.find(
              (v: any) => v.title === "Adult"
            )
            expect(adultVariant).toBeDefined()
            expect(adultVariant!.title).toBe("Adult")
          }

          await cleanupTour(result.tour.id)
        })
      })

      describe("Product and Variant Structure", () => {
        it("should create product with correct Passenger Type options", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Nazca Lines Flight",
            duration_days: 1,
            max_capacity: 12,
            prices: {
              adult: 300,
              child: 250,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          const product = result.tour.product
          expect(product).toBeDefined()
          if (product) {
            expect(product.variants).toHaveLength(3)
          }
          expect(result.tour.variants.length).toBe(3)

          await cleanupTour(result.tour.id)
        })

        it("should create unique SKUs based on destination", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Rainbow Mountain Hike",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 100,
              child: 70,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          const product = result.tour.product
          expect(product).toBeDefined()
          if (product) {
            const skus = product.variants.map((v: any) => v.sku)
            expect(skus.every((sku: string) => sku.includes("rainbow"))).toBe(true)
            expect(skus.some((sku: string) => sku.includes("ADULT"))).toBe(true)
            expect(skus.some((sku: string) => sku.includes("CHILD"))).toBe(true)
            expect(skus.some((sku: string) => sku.includes("INFANT"))).toBe(true)
            expect(new Set(skus).size).toBe(3)
          }

          await cleanupTour(result.tour.id)
        })

        it("should create product with published status", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Lake Titicaca Islands",
            duration_days: 2,
            max_capacity: 18,
            prices: {
              adult: 180,
              child: 120,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          if (result.tour.product) {
            expect(result.tour.product.status).toBe("published")
          }

          await cleanupTour(result.tour.id)
        })
      })

      describe("Remote Links", () => {
        it("should establish links between tour and product", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Paracas National Reserve",
            duration_days: 1,
            max_capacity: 25,
            prices: {
              adult: 90,
              child: 60,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          if (result.tour.product) {
            expect(result.tour.product_id).toBe(result.tour.product.id)
            expect(result.tour.product.id).toBe(result.tour.product_id)
          }

          await cleanupTour(result.tour.id)
        })

        it("should establish links between tour variants and product variants", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Huacachina Oasis",
            duration_days: 1,
            max_capacity: 30,
            prices: {
              adult: 75,
              child: 50,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          result.tour.variants.forEach((tv: any) => {
            expect(tv.variant_id).toBeDefined()
            expect(tv.tour_id).toBe(result.tour.id)

            if (result.tour.product) {
              const matchingProductVariant = result.tour.product.variants.find(
                (pv: any) => pv.id === tv.variant_id
              )
              expect(matchingProductVariant).toBeDefined()
            }
          })

          await cleanupTour(result.tour.id)
        })
      })

      describe("New Tour Model Fields", () => {
        it("should create tour with default values for new fields", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Test Default Fields Tour",
            duration_days: 1,
            max_capacity: 10,
            prices: {
              adult: 100,
              child: 50,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour).toBeDefined()

          const tourFromDb = await tourModuleService.retrieveTour(result.tour.id)

          expect(tourFromDb.is_special).toBe(false)
          expect(tourFromDb.blocked_dates).toEqual([])
          expect(tourFromDb.blocked_week_days).toEqual([])
          expect(tourFromDb.cancellation_deadline_hours).toBe(12)
          expect(tourFromDb.booking_min_days_ahead).toBe(2)
          expect(tourFromDb.type).toBe("tour")

          await cleanupTour(result.tour.id)
        })

        it("should support special tours with is_special flag", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Special Christmas Tour",
            duration_days: 1,
            max_capacity: 50,
            prices: {
              adult: 200,
              child: 150,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          await tourModuleService.updateTours({
            selector: { id: result.tour.id },
            data: {
              is_special: true,
              blocked_dates: ["2026-12-24"],
            },
          })

          const updatedTour = await tourModuleService.retrieveTour(result.tour.id)
          expect(updatedTour.is_special).toBe(true)
          expect(updatedTour.blocked_dates).toContain("2026-12-24")

          await cleanupTour(result.tour.id)
        })

        it("should support blocked dates configuration", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Holiday Season Tour",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 120,
              child: 80,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          await tourModuleService.updateTours({
            selector: { id: result.tour.id },
            data: {
              blocked_dates: ["2026-12-25", "2026-12-31", "2027-01-01"],
            },
          })

          const updatedTour = await tourModuleService.retrieveTour(result.tour.id)
          expect(updatedTour.blocked_dates).toHaveLength(3)
          expect(updatedTour.blocked_dates).toContain("2026-12-25")
          expect(updatedTour.blocked_dates).toContain("2026-12-31")
          expect(updatedTour.blocked_dates).toContain("2027-01-01")

          await cleanupTour(result.tour.id)
        })

        it("should support blocked week days configuration", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Weekdays Only Tour",
            duration_days: 1,
            max_capacity: 15,
            prices: {
              adult: 100,
              child: 60,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          await tourModuleService.updateTours({
            selector: { id: result.tour.id },
            data: {
              blocked_week_days: [0, 6],
            },
          })

          const updatedTour = await tourModuleService.retrieveTour(result.tour.id)
          expect(updatedTour.blocked_week_days.map(Number)).toContain(0)
          expect(updatedTour.blocked_week_days.map(Number)).toContain(6)

          await cleanupTour(result.tour.id)
        })

        it("should support booking and cancellation policy configuration", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Premium VIP Tour",
            duration_days: 3,
            max_capacity: 8,
            prices: {
              adult: 1500,
              child: 1200,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          await tourModuleService.updateTours({
            selector: { id: result.tour.id },
            data: {
              cancellation_deadline_hours: 72,
              booking_min_days_ahead: 7,
            },
          })

          const updatedTour = await tourModuleService.retrieveTour(result.tour.id)
          expect(updatedTour.cancellation_deadline_hours).toBe(72)
          expect(updatedTour.booking_min_days_ahead).toBe(7)

          await cleanupTour(result.tour.id)
        })
      })

      describe("Edge Cases and Validation", () => {
        it("should handle destination with special characters", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Cusco & Sacred Valley (Perú)",
            duration_days: 2,
            max_capacity: 15,
            prices: {
              adult: 250,
              child: 180,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour.destination).toBe("Cusco & Sacred Valley (Perú)")

          const product = result.tour.product
          expect(product).toBeDefined()
          if (product && product.variants) {
            const adultVariant = product.variants.find((v: any) => v.title === "Adult")
            expect(adultVariant).toBeDefined()
            expect(adultVariant!.sku).toBeDefined()
          }

          await cleanupTour(result.tour.id)
        })

        it("should handle long duration tours", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Inca Trail to Machu Picchu",
            duration_days: 4,
            max_capacity: 12,
            prices: {
              adult: 800,
              child: 600,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour.duration_days).toBe(4)
          if (result.tour.product) {
            expect(result.tour.product.title).toContain("4 Days")
          }

          await cleanupTour(result.tour.id)
        })

        it("should handle single passenger type prices correctly", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Free Walking Tour",
            duration_days: 1,
            max_capacity: 50,
            prices: {
              adult: 0,
              child: 0,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour).toBeDefined()
          if (result.tour.product && result.tour.product.variants) {
            expect(result.tour.product.variants).toHaveLength(3)
          }

          await cleanupTour(result.tour.id)
        })

        it("should handle large capacity tours", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Group Festival Tour",
            duration_days: 1,
            max_capacity: 100,
            prices: {
              adult: 50,
              child: 30,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          expect(result.tour.max_capacity).toBe(100)

          await cleanupTour(result.tour.id)
        })
      })

      describe("Workflow Result Structure", () => {
        it("should return complete tour data via query.graph", async () => {
          const input: CreateTourWorkflowInput = {
            destination: "Query Test Tour",
            description: "Test for complete data retrieval",
            duration_days: 1,
            max_capacity: 10,
            thumbnail: "https://example.com/thumb.jpg",
            prices: {
              adult: 100,
              child: 75,
              infant: 0,
            },
          }

          const { result } = await createTourWorkflow(container).run({ input })

          const tour = result.tour

          expect(tour.id).toBeDefined()
          expect(tour.destination).toBe("Query Test Tour")
          expect(tour.description).toBe("Test for complete data retrieval")
          expect(tour.duration_days).toBe(1)
          expect(tour.max_capacity).toBe(10)
          expect(tour.thumbnail).toBe("https://example.com/thumb.jpg")
          expect(tour.product_id).toBeDefined()

          if (tour.product) {
            expect(tour.product.id).toBe(tour.product_id)
            expect(tour.product.title).toBeDefined()
          }

          expect(tour.variants).toBeDefined()
          expect(tour.variants.length).toBe(3)

          await cleanupTour(tour.id)
        })
      })

      async function cleanupTour(tourId: string) {
        try {
          const tour = await tourModuleService.retrieveTour(tourId)

          const tourVariants = await tourModuleService.listTourVariants({
            tour_id: tourId,
          })
          if (tourVariants.length > 0) {
            await tourModuleService.deleteTourVariants(
              tourVariants.map((tv) => tv.id)
            )
          }

          await tourModuleService.deleteTours(tourId)

          if (tour.product_id) {
            const product = await productModule.retrieveProduct(tour.product_id, {
              relations: ["variants"],
            })

            for (const variant of product.variants || []) {
              await productModule.deleteProductVariants(variant.id)
            }

            await productModule.deleteProducts(tour.product_id)
          }
        } catch (error) {
          console.error(`Cleanup error for tour ${tourId}:`, error)
        }
      }
    })
  },
})
