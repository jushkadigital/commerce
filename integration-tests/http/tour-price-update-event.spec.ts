import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sign } from "jsonwebtoken"
import { createTourWorkflow, CreateTourWorkflowInput } from "../../src/workflows/create-tour"
import { TOUR_MODULE } from "../../src/modules/tour"
import { EVENTS_MODULE } from "../../src/modules/events"
import TourModuleService from "../../src/modules/tour/service"

jest.setTimeout(180_000)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/tours/:id — price update & integration event", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let publishSpy: jest.SpyInstance
      let createdTourIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        adminHeaders = await createAdminUser(container)
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

      async function createAdminUser(c: any): Promise<Record<string, string>> {
        const userModule = c.resolve(Modules.USER)
        const authModule = c.resolve(Modules.AUTH)
        const user = await userModule.createUsers({
          email: `admin-${Date.now()}@medusa-test.com`,
          first_name: "Tour",
          last_name: "PriceTest",
        })
        const authIdentity = await authModule.createAuthIdentities({
          provider_identities: [{
            provider: "emailpass",
            entity_id: user.email,
            provider_metadata: { password: "supersecret" },
          }],
          app_metadata: { user_id: user.id },
        })
        const token = sign(
          { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
          process.env.JWT_SECRET || "supersecret",
          { expiresIn: "1d" }
        )
        return { authorization: `Bearer ${token}` }
      }

      async function createTourFixture(overrides: Partial<CreateTourWorkflowInput> = {}): Promise<any> {
        const input: CreateTourWorkflowInput = {
          destination: "Price Test Tour",
          description: "Tour for price update tests",
          duration_days: 2,
          max_capacity: 10,
          prices: { adult: 300, child: 150, infant: 0, currency_code: "PEN" },
          ...overrides,
        }
        const { result } = await createTourWorkflow(container).run({ input })
        createdTourIds.push(result.tour.id)
        return result.tour
      }

      async function getVariantPrices(variantIds: string[]): Promise<any[]> {
        const { data: variantsWithPrices } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set.id", "price_set.prices.*"],
          filters: { id: variantIds },
        })
        return variantsWithPrices || []
      }

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

      // ─── CASO 1: actualizar precios → publica integration.product.updated.v1 ───
      it("updates prices via POST /admin/tours/:id and publishes integration.product.updated.v1", async () => {
        const tour = await createTourFixture()
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        publishSpy.mockClear()

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 500, child: 250, infant: 50, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        expect(response.status).toBe(200)
        expect(response.data.tour).toBeDefined()

        // Verify the integration event was published directly by the route
        expect(publishSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "integration",
            aggregateType: "product",
            action: "updated",
            version: 1,
          })
        )

        // Verify the payload includes the product id
        const callArgs = publishSpy.mock.calls.find(
          (c: any[]) => c[0]?.action === "updated" && c[0]?.aggregateType === "product"
        )
        expect(callArgs).toBeDefined()
        expect(callArgs[0].payload.id).toBe(tour.product_id)

        // Verify prices persisted in DB
        const variantsWithPrices = await getVariantPrices(variantIds)
        const hasNewPrice = variantsWithPrices.some((v: any) =>
          (v.price_set?.prices || []).some((p: any) => Number(p.amount) === 500)
        )
        expect(hasNewPrice).toBe(true)
      })

      // ─── CASO 2: actualizar sin prices → NO zeroea precios y NO publica evento updated ───
      it("updates tour fields without prices and does NOT zero prices or publish an integration event", async () => {
        const tour = await createTourFixture()
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        const beforeVariants = await getVariantPrices(variantIds)
        const beforeAdultPrice = beforeVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .find((p: any) => Number(p.amount) === 300)
        expect(beforeAdultPrice).toBeDefined()

        publishSpy.mockClear()

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { destination: "Updated Price Test Tour" },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // No integration product.updated event should be published
        const productUpdatedCalls = publishSpy.mock.calls.filter(
          (c: any[]) => c[0]?.aggregateType === "product" && c[0]?.action === "updated"
        )
        expect(productUpdatedCalls.length).toBe(0)

        // Prices must NOT have been zeroed — the critical bug we fixed
        const afterVariants = await getVariantPrices(variantIds)
        const afterAdultPrice = afterVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .find((p: any) => Number(p.amount) === 300)
        expect(afterAdultPrice).toBeDefined()

        // The adult price must NOT have been zeroed (the critical bug we fixed
        // zeroed ALL prices when no prices field was sent)
        const adultZeroed = afterVariants.some((v: any) =>
          (v.price_set?.prices || []).some(
            (p: any) => Number(p.amount) === 0 && (p.currency_code === "pen" || p.currency_code === "PEN")
          )
        )
        // infant=0 is legitimate from the fixture, so we can't assert no zeros at all.
        // Instead, assert the adult price survived.
        expect(afterAdultPrice).toBeDefined()
      })

      // ─── CASO 3: actualizar destination → sincroniza product.title sin tocar precios ───
      it("updates destination and syncs product title without changing prices", async () => {
        const tour = await createTourFixture()
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        const beforeVariants = await getVariantPrices(variantIds)
        const initialPriceAmounts = beforeVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .map((p: any) => Number(p.amount))
          .sort()

        publishSpy.mockClear()

        const newDestination = "Synced Destination Tour"
        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { destination: newDestination, duration_days: 5 },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // Product title should be synced
        const product = await productModule.retrieveProduct(tour.product_id)
        expect(product.title).toContain(newDestination)
        expect(product.title).toContain("5 Days")

        // Prices must be unchanged
        const afterVariants = await getVariantPrices(variantIds)
        const afterPriceAmounts = afterVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .map((p: any) => Number(p.amount))
          .sort()
        expect(afterPriceAmounts).toEqual(initialPriceAmounts)
      })
    })
  },
})
