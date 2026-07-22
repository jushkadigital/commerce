import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sign } from "jsonwebtoken"
import { createTourWorkflow, CreateTourWorkflowInput } from "../../src/workflows/create-tour"
import { TOUR_MODULE } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"

jest.setTimeout(180_000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/tours/:id — workflow persistence validation (REST)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let createdTourIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        adminHeaders = await createAdminUser(container)
      })

      afterEach(async () => {
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
          first_name: "Persistence",
          last_name: "Test",
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
          destination: "Persistence Test Tour",
          description: "Tour for persistence validation",
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

      // ─── CASO 1: full update (simula el payload completo del dashboard) → todos los campos persisten ───
      it("updates max_capacity, destination, duration, and prices — all persist in DB", async () => {
        const tour = await createTourFixture()
        expect(tour.max_capacity).toBe(10)

        // Simulate the FULL dashboard payload (all fields, like the modal sends)
        const response = await api.post(
          `/admin/tours/${tour.id}`,
          {
            destination: "Updated Destination Tour",
            description: "Updated description",
            duration_days: 5,
            max_capacity: 25,
            is_special: true,
            booking_min_days_ahead: 3,
            blocked_dates: ["2026-08-15"],
            blocked_week_days: ["0", "6"],
            prices: { adult: 500, child: 250, infant: 50, currency_code: "PEN" },
          },
          { headers: adminHeaders }
        )

        expect(response.status).toBe(200)
        expect(response.data.tour).toBeDefined()

        // ── Verify TOUR ENTITY fields persisted (retrieve fresh from DB) ──
        const retrieved = await tourModuleService.retrieveTour(tour.id)
        expect(retrieved.max_capacity).toBe(25)
        expect(retrieved.destination).toBe("Updated Destination Tour")
        expect(retrieved.duration_days).toBe(5)
        expect(retrieved.description).toBe("Updated description")
        expect(retrieved.is_special).toBe(true)
        expect(retrieved.booking_min_days_ahead).toBe(3)
        expect(retrieved.blocked_dates).toEqual(["2026-08-15"])
        expect(retrieved.blocked_week_days).toEqual(["0", "6"])

        // ── Verify PRICES persisted (query Pricing Module) ──
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)
        const variantsWithPrices = await getVariantPrices(variantIds)
        const allPrices = variantsWithPrices.flatMap((v: any) => v.price_set?.prices || [])
        const adultPrice = allPrices.find((p: any) =>
          Number(p.amount) === 500 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(adultPrice).toBeDefined()
        expect(Number(adultPrice.amount)).toBe(500)

        // ── Verify OLD price is gone ──
        const oldPrice = allPrices.find((p: any) =>
          Number(p.amount) === 300 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(oldPrice).toBeUndefined()
      })

      // ─── CASO 2: update ONLY max_capacity (no prices) → max_capacity persists, prices unchanged ───
      it("updates only max_capacity without prices — max_capacity persists, prices unchanged", async () => {
        const tour = await createTourFixture()

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { max_capacity: 50 },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // max_capacity must persist
        const retrieved = await tourModuleService.retrieveTour(tour.id)
        expect(retrieved.max_capacity).toBe(50)

        // Prices must be unchanged (NOT zeroed)
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)
        const variantsWithPrices = await getVariantPrices(variantIds)
        const allPrices = variantsWithPrices.flatMap((v: any) => v.price_set?.prices || [])
        const adultPrice = allPrices.find((p: any) => Number(p.amount) === 300)
        expect(adultPrice).toBeDefined()
        expect(Number(adultPrice.amount)).toBe(300)
      })

      // ─── CASO 3: update ONLY prices (no max_capacity) → prices persist, max_capacity unchanged ───
      it("updates only prices without max_capacity — prices persist, max_capacity unchanged", async () => {
        const tour = await createTourFixture()
        expect(tour.max_capacity).toBe(10)

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 999, child: 499, infant: 10, currency_code: "PEN" } },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // max_capacity must be unchanged
        const retrieved = await tourModuleService.retrieveTour(tour.id)
        expect(retrieved.max_capacity).toBe(10)

        // Prices must persist
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)
        const variantsWithPrices = await getVariantPrices(variantIds)
        const allPrices = variantsWithPrices.flatMap((v: any) => v.price_set?.prices || [])
        const adultPrice = allPrices.find((p: any) => Number(p.amount) === 999)
        expect(adultPrice).toBeDefined()
      })

      // ─── CASO 4: response shape — the POST response includes max_capacity and other fields ───
      it("returns the updated tour with max_capacity in the response", async () => {
        const tour = await createTourFixture()

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { max_capacity: 30, destination: "Response Shape Test" },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)
        expect(response.data.tour).toBeDefined()
        expect(response.data.tour.max_capacity).toBe(30)
        expect(response.data.tour.destination).toBe("Response Shape Test")
      })
    })
  },
})
