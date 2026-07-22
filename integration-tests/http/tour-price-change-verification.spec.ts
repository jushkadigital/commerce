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
    describe("Tour price change — verification against source of truth (Pricing Module)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let pricingModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let createdTourIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        pricingModule = container.resolve(Modules.PRICING)
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
          first_name: "Price",
          last_name: "Verify",
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
          destination: "Price Verify Tour",
          description: "Tour for price change verification",
          duration_days: 2,
          max_capacity: 10,
          prices: { adult: 300, child: 150, infant: 0, currency_code: "PEN" },
          ...overrides,
        }
        const { result } = await createTourWorkflow(container).run({ input })
        createdTourIds.push(result.tour.id)
        return result.tour
      }

      async function getVariantIds(tourId: string): Promise<string[]> {
        const tour = await tourModuleService.retrieveTour(tourId, { relations: ["variants"] })
        return (tour.variants || [])
          .map((v: any) => v.variant_id)
          .filter(Boolean)
      }

      // Read raw prices from the Pricing Module (source of truth #1)
      async function getRawPrices(variantIds: string[]): Promise<any[]> {
        const { data: variantsWithPrices } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set.id", "price_set.prices.*"],
          filters: { id: variantIds },
        })
        return (variantsWithPrices || []).flatMap((v: any) => v.price_set?.prices || [])
      }

      // Read calculated prices from the Pricing Module (source of truth #2)
      async function getCalculatedPrices(variantIds: string[], currencyCode: string = "PEN"): Promise<any[]> {
        return await pricingModule.calculatePrices(
          { id: variantIds },
          { context: { currency_code: currencyCode } }
        )
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

      // ─── CASO 1: cambiar precio adult 300→500 → el precio crudo en DB es 500, no 300 ───
      it("changes adult price 300→500 and the raw price in Pricing Module is 500 (not 300)", async () => {
        const tour = await createTourFixture()
        const variantIds = await getVariantIds(tour.id)

        // Verify initial state: adult price is 300 in the DB
        const initialRawPrices = await getRawPrices(variantIds)
        const initialAdultPrice = initialRawPrices.find(
          (p: any) => Number(p.amount) === 300 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(initialAdultPrice).toBeDefined()

        // Update price via the endpoint
        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 500, child: 250, infant: 50, currency_code: "PEN" } },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // ── SOURCE OF TRUTH #1: read raw prices from Pricing Module (NOT the HTTP response) ──
        const rawPrices = await getRawPrices(variantIds)
        const newAdultPrice = rawPrices.find(
          (p: any) => Number(p.amount) === 500 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(newAdultPrice).toBeDefined()
        expect(Number(newAdultPrice.amount)).toBe(500)

        // The OLD price (300) must be GONE — proves the change actually happened, not duplicated
        const oldAdultPrice = rawPrices.find(
          (p: any) => Number(p.amount) === 300 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(oldAdultPrice).toBeUndefined()
      })

      // ─── CASO 3: cambiar precio → GET /admin/tours/:id/pricing devuelve el nuevo precio (lectura fresca) ───
      it("changes price and a fresh GET /admin/tours/:id/pricing returns the new price", async () => {
        const tour = await createTourFixture()

        // Verify initial pricing via the GET endpoint
        const initialGet = await api.get(`/admin/tours/${tour.id}/pricing`, { headers: adminHeaders })
        expect(initialGet.status).toBe(200)
        expect(initialGet.data.prices.adult.PEN).toBe(300)

        // Update price
        await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 600, child: 300, infant: 0, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        // ── SOURCE OF TRUTH #3: fresh GET (separate HTTP request, proves it's not cached in the response) ──
        const freshGet = await api.get(`/admin/tours/${tour.id}/pricing`, { headers: adminHeaders })
        expect(freshGet.status).toBe(200)
        expect(freshGet.data.prices.adult.PEN).toBe(600)
        expect(freshGet.data.prices.child.PEN).toBe(300)
        expect(freshGet.data.prices.infant.PEN).toBe(0)
      })

      // ─── CASO 4: cambiar precio child e infant (no solo adult) → los 3 persisten ───
      it("changes all three passenger prices (adult, child, infant) and all persist", async () => {
        const tour = await createTourFixture()
        const variantIds = await getVariantIds(tour.id)

        await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 800, child: 400, infant: 100, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        const rawPrices = await getRawPrices(variantIds)
        const allAmounts = rawPrices
          .filter((p: any) => p.currency_code === "pen" || p.currency_code === "PEN")
          .map((p: any) => Number(p.amount))
          .sort()

        // The three new prices must all be present
        expect(allAmounts).toContain(800)
        expect(allAmounts).toContain(400)
        expect(allAmounts).toContain(100)

        // The old prices (300, 150, 0 from fixture) must be gone for PEN
        // (0 may still exist if infant was 0→100, so check 300 and 150 are gone)
        const oldPrices = [300, 150].filter((old) => allAmounts.includes(old))
        expect(oldPrices.length).toBe(0)
      })
    })
  },
})