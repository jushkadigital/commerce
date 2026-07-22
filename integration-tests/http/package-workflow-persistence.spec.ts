import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sign } from "jsonwebtoken"
import { createPackageWorkflow, CreatePackageWorkflowInput } from "../../src/workflows/create-package"
import { PACKAGE_MODULE } from "../../src/modules/package"
import PackageModuleService from "../../src/modules/package/service"

jest.setTimeout(180_000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/packages/:id — workflow persistence validation (REST)", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let createdPackageIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
        adminHeaders = await createAdminUser(container)
      })

      afterEach(async () => {
        for (const packageId of createdPackageIds) {
          await cleanupPackage(packageId)
        }
        createdPackageIds = []
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

      async function createPackageFixture(overrides: Partial<CreatePackageWorkflowInput> = {}): Promise<any> {
        const input: CreatePackageWorkflowInput = {
          destination: "Persistence Test Package",
          description: "Package for persistence validation",
          duration_days: 2,
          max_capacity: 10,
          prices: { adult: 400, child: 200, infant: 0, currency_code: "PEN" },
          ...overrides,
        }
        const { result } = await createPackageWorkflow(container).run({ input })
        createdPackageIds.push(result.package.id)
        return result.package
      }

      async function getVariantIds(packageId: string): Promise<string[]> {
        const pkg = await packageModuleService.retrievePackage(packageId, { relations: ["variants"] })
        return (pkg.variants || [])
          .map((v: any) => v.variant_id)
          .filter(Boolean)
      }

      async function getVariantPrices(variantIds: string[]): Promise<any[]> {
        const { data: variantsWithPrices } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set.id", "price_set.prices.*"],
          filters: { id: variantIds },
        })
        return variantsWithPrices || []
      }

      async function cleanupPackage(packageId: string): Promise<void> {
        try {
          const pkg = await packageModuleService.retrievePackage(packageId)
          const packageVariants = await packageModuleService.listPackageVariants({ package_id: packageId })
          if (packageVariants.length > 0) {
            await packageModuleService.deletePackageVariants(packageVariants.map((pv: any) => pv.id))
          }
          await packageModuleService.deletePackages(packageId)
          if (pkg.product_id) {
            const product = await productModule.retrieveProduct(pkg.product_id, { relations: ["variants"] })
            for (const variant of product.variants || []) {
              await productModule.deleteProductVariants(variant.id)
            }
            await productModule.deleteProducts(pkg.product_id)
          }
        } catch (error) {
          console.error(`Cleanup error for package ${packageId}:`, error)
        }
      }

      // ─── CASO 1: full update (simula el payload completo del dashboard) → todos los campos persisten ───
      it("updates max_capacity, destination, duration, and prices — all persist in DB", async () => {
        const pkg = await createPackageFixture()
        expect(pkg.max_capacity).toBe(10)

        // Simulate the FULL dashboard payload (all fields, like the modal sends)
        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          {
            destination: "Updated Destination Package",
            description: "Updated description",
            duration_days: 5,
            max_capacity: 25,
            is_special: true,
            booking_min_days_ahead: 3,
            blocked_dates: ["2026-08-15"],
            blocked_week_days: ["0", "6"],
            prices: { adult: 600, child: 300, infant: 80, currency_code: "PEN" },
          },
          { headers: adminHeaders }
        )

        expect(response.status).toBe(200)
        expect(response.data.package).toBeDefined()

        // ── Verify PACKAGE ENTITY fields persisted (retrieve fresh from DB) ──
        const retrieved = await packageModuleService.retrievePackage(pkg.id)
        expect(retrieved.max_capacity).toBe(25)
        expect(retrieved.destination).toBe("Updated Destination Package")
        expect(retrieved.duration_days).toBe(5)
        expect(retrieved.description).toBe("Updated description")
        expect(retrieved.is_special).toBe(true)
        expect(retrieved.booking_min_days_ahead).toBe(3)
        expect(retrieved.blocked_dates).toEqual(["2026-08-15"])
        expect(retrieved.blocked_week_days).toEqual(["0", "6"])

        // ── Verify PRICES persisted (query Pricing Module) ──
        const variantIds = await getVariantIds(pkg.id)
        const variantsWithPrices = await getVariantPrices(variantIds)
        const allPrices = variantsWithPrices.flatMap((v: any) => v.price_set?.prices || [])
        const adultPrice = allPrices.find((p: any) =>
          Number(p.amount) === 600 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(adultPrice).toBeDefined()
        expect(Number(adultPrice.amount)).toBe(600)

        // ── Verify OLD price is gone ──
        const oldPrice = allPrices.find((p: any) =>
          Number(p.amount) === 400 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(oldPrice).toBeUndefined()
      })

      // ─── CASO 2: update ONLY max_capacity (no prices) → max_capacity persists, prices unchanged ───
      it("updates only max_capacity without prices — max_capacity persists, prices unchanged", async () => {
        const pkg = await createPackageFixture()

        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { max_capacity: 50 },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // max_capacity must persist
        const retrieved = await packageModuleService.retrievePackage(pkg.id)
        expect(retrieved.max_capacity).toBe(50)

        // Prices must be unchanged (NOT zeroed)
        const variantIds = await getVariantIds(pkg.id)
        const variantsWithPrices = await getVariantPrices(variantIds)
        const allPrices = variantsWithPrices.flatMap((v: any) => v.price_set?.prices || [])
        const adultPrice = allPrices.find((p: any) => Number(p.amount) === 400)
        expect(adultPrice).toBeDefined()
        expect(Number(adultPrice.amount)).toBe(400)
      })

      // ─── CASO 3: update ONLY prices (no max_capacity) → prices persist, max_capacity unchanged ───
      it("updates only prices without max_capacity — prices persist, max_capacity unchanged", async () => {
        const pkg = await createPackageFixture()
        expect(pkg.max_capacity).toBe(10)

        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { prices: { adult: 999, child: 499, infant: 10, currency_code: "PEN" } },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // max_capacity must be unchanged
        const retrieved = await packageModuleService.retrievePackage(pkg.id)
        expect(retrieved.max_capacity).toBe(10)

        // Prices must persist
        const variantIds = await getVariantIds(pkg.id)
        const variantsWithPrices = await getVariantPrices(variantIds)
        const allPrices = variantsWithPrices.flatMap((v: any) => v.price_set?.prices || [])
        const adultPrice = allPrices.find((p: any) => Number(p.amount) === 999)
        expect(adultPrice).toBeDefined()
      })

      // ─── CASO 4: response shape — the POST response includes max_capacity and other fields ───
      it("returns the updated package with max_capacity in the response", async () => {
        const pkg = await createPackageFixture()

        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { max_capacity: 30, destination: "Response Shape Test" },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)
        expect(response.data.package).toBeDefined()
        expect(response.data.package.max_capacity).toBe(30)
        expect(response.data.package.destination).toBe("Response Shape Test")
      })
    })
  },
})