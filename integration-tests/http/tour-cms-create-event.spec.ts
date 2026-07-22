import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../src/modules/tour"
import { EVENTS_MODULE } from "../../src/modules/events"
import TourModuleService from "../../src/modules/tour/service"
import tourCreatedSubscriber from "../../src/subscribers/tourCreated"

jest.setTimeout(180_000)

function buildCmsTourPayload(testId: number, destination: string) {
  return {
    id: testId,
    slug: `test-tour-${testId}`,
    data: {
      destination,
      description: {
        root: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Tour created from CMS event test" }] },
          ],
        },
      },
      duration_days: 3,
      max_capacity: 20,
      thumbnail: "https://example.com/test-tour.jpg",
      price: 250,
      categories: [{ name: "Adventure" }],
      destinos: { name: "Cusco" },
      difficulty: "medium",
    },
  }
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("CMS Tour Create Flow — subscriber creates tour from integration.tour.published.v1", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let query: any
      let publishSpy: jest.SpyInstance
      let createdTourIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        const eventModuleService = container.resolve(EVENTS_MODULE)
        publishSpy = jest.spyOn(eventModuleService, "publishEvent").mockResolvedValue(undefined)
      })

      afterEach(async () => {
        publishSpy.mockRestore()
        for (const tourId of createdTourIds) {
          await cleanupTour(tourId)
        }
        createdTourIds = []
      })

      async function cleanupTour(tourId: string): Promise<void> {
        try {
          const tour = await tourModuleService.retrieveTour(tourId)
          const tourVariants = await tourModuleService.listTourVariants({ tour_id: tourId })
          if (tourVariants.length > 0) {
            await tourModuleService.deleteTourVariants(tourVariants.map((tv: any) => tv.id))
          }
          await tourModuleService.deleteTours(tourId)
          if (tour.product_id) {
            const product = await productModule.retrieveProduct(tour.product_id, { relations: ["variants"] })
            for (const variant of product.variants || []) {
              await productModule.deleteProductVariants(variant.id)
            }
            await productModule.deleteProducts(tour.product_id)
          }
        } catch (error) {
          console.error(`Cleanup error for tour ${tourId}:`, error)
        }
      }

      // CASO 1: subscriber recibe tour.published.v1 → crea tour con product + variants + precios
      it("receives integration.tour.published.v1, creates tour via workflow, and publishes tour.published event", async () => {
        const testId = Date.now()
        const payloadId = `${testId}tour`
        const destination = `CMS Create Test Tour ${testId}`
        const cmsPayload = buildCmsTourPayload(testId, destination)

        publishSpy.mockClear()

        // Invoke the subscriber handler directly with a mock event
        await tourCreatedSubscriber({
          event: { name: "integration.tour.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        // Verify the tour was created
        const tours = await tourModuleService.getTourByMetadata(payloadId)
        expect(tours.length).toBe(1)
        const tour = tours[0]
        expect(tour.destination).toBe(destination)
        expect(tour.duration_days).toBe(3)
        // The workflow generates its own slug from destination + duration, not from the CMS slug field
        expect(tour.slug).toBeDefined()
        expect(tour.product_id).toBeDefined()
        createdTourIds.push(tour.id)

        // Verify the subscriber published the tour.published integration event
        const publishedCall = publishSpy.mock.calls.find(
          (c: any[]) => c[0]?.aggregateType === "tour" && c[0]?.action === "published"
        )
        expect(publishedCall).toBeDefined()
        expect(publishedCall[0].payload.id).toBe(tour.id)
        expect(publishedCall[0].payload.productId).toBe(tour.product_id)
        expect(publishedCall[0].payload.destination).toBe(destination)

        // Verify the product was created with the right title
        const product = await productModule.retrieveProduct(tour.product_id)
        expect(product.title).toContain(destination)

        // Verify variants exist (adult, child, infant)
        const productWithVariants = await productModule.retrieveProduct(tour.product_id, { relations: ["variants"] })
        expect(productWithVariants.variants.length).toBe(3)
      })

      // CASO 2: subscriber con payload mínimo → crea tour correctamente
      it("creates a tour from minimal CMS payload via subscriber", async () => {
        const testId = Date.now() + 1
        const payloadId = `${testId}tour`
        const cmsPayload = {
          id: testId,
          slug: `test-tour-${testId}`,
          data: {
            destination: `Minimal CMS Tour ${testId}`,
            description: { root: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Minimal" }] }] } },
            duration_days: 1,
            max_capacity: 5,
            thumbnail: "",
            price: 100,
            categories: [],
            destinos: { name: "" },
            difficulty: "",
          },
        }

        publishSpy.mockClear()

        await tourCreatedSubscriber({
          event: { name: "integration.tour.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        const tours = await tourModuleService.getTourByMetadata(payloadId)
        expect(tours.length).toBe(1)
        const tour = tours[0]
        expect(tour.product_id).toBeDefined()
        createdTourIds.push(tour.id)

        const publishedCall = publishSpy.mock.calls.find(
          (c: any[]) => c[0]?.aggregateType === "tour" && c[0]?.action === "published"
        )
        expect(publishedCall).toBeDefined()
      })

      // CASO 3: subscriber con el mismo evento duplicado → el workflow de tour no crea un duplicado (handle ya existe, resuelve sin crear)
      it("does not create a duplicate tour when the same CMS event is processed twice", async () => {
        const testId = Date.now() + 2
        const payloadId = `${testId}tour`
        const cmsPayload = buildCmsTourPayload(testId, `Dedup Test Tour ${testId}`)

        publishSpy.mockClear()

        // Invoke subscriber once — creates the first tour
        await tourCreatedSubscriber({
          event: { name: "integration.tour.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        let tours = await tourModuleService.getTourByMetadata(payloadId)
        expect(tours.length).toBe(1)
        createdTourIds.push(tours[0].id)

        // Invoke subscriber again — the tour workflow resolves without creating a duplicate
        // (the product handle already exists; the workflow handles the collision gracefully)
        await tourCreatedSubscriber({
          event: { name: "integration.tour.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        tours = await tourModuleService.getTourByMetadata(payloadId)
        expect(tours.length).toBe(1)
      })
    })
  },
})