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
    describe("Package price change — verification against source of truth (Pricing Module)", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let pricingModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let createdPackageIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        pricingModule = container.resolve(Modules.PRICING)
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

      async function createPackageFixture(overrides: Partial<CreatePackageWorkflowInput> = {}): Promise<any> {
        const input: CreatePackageWorkflowInput = {
          destination: "Price Verify Package",
          description: "Package for price change verification",
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

      // ─── CASO 1: cambiar precio adult 400→600 → el precio crudo en DB es 600, no 400 ───
      it("changes adult price 400→600 and the raw price in Pricing Module is 600 (not 400)", async () => {
        const pkg = await createPackageFixture()
        const variantIds = await getVariantIds(pkg.id)

        // Verify initial state: adult price is 400 in the DB
        const initialRawPrices = await getRawPrices(variantIds)
        const initialAdultPrice = initialRawPrices.find(
          (p: any) => Number(p.amount) === 400 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(initialAdultPrice).toBeDefined()

        // Update price via the endpoint
        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { prices: { adult: 600, child: 300, infant: 80, currency_code: "PEN" } },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // ── SOURCE OF TRUTH #1: read raw prices from Pricing Module (NOT the HTTP response) ──
        const rawPrices = await getRawPrices(variantIds)
        const newAdultPrice = rawPrices.find(
          (p: any) => Number(p.amount) === 600 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(newAdultPrice).toBeDefined()
        expect(Number(newAdultPrice.amount)).toBe(600)

        // The OLD price (400) must be GONE
        const oldAdultPrice = rawPrices.find(
          (p: any) => Number(p.amount) === 400 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(oldAdultPrice).toBeUndefined()
      })

      // ─── CASO 3: cambiar precio → una segunda lectura fresca confirma el cambio (no cache) ───
      it("changes price and a fresh DB read confirms the change persisted (not cached)", async () => {
        const pkg = await createPackageFixture()
        const variantIds = await getVariantIds(pkg.id)

        // First read
        const beforePrices = await getRawPrices(variantIds)
        const beforeAmounts = beforePrices
          .filter((p: any) => p.currency_code === "pen" || p.currency_code === "PEN")
          .map((p: any) => Number(p.amount))
          .sort()
        expect(beforeAmounts).toContain(400)

        // Update
        await api.post(
          `/admin/packages/${pkg.id}`,
          { prices: { adult: 550, child: 275, infant: 0, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        // Second fresh read (separate DB query, proves persistence not HTTP response caching)
        const afterPrices = await getRawPrices(variantIds)
        const afterAmounts = afterPrices
          .filter((p: any) => p.currency_code === "pen" || p.currency_code === "PEN")
          .map((p: any) => Number(p.amount))
          .sort()

        expect(afterAmounts).toContain(550)
        expect(afterAmounts).not.toContain(400)
      })

      // ─── CASO 4: cambiar los 3 precios (adult, child, infant) → los 3 persisten ───
      it("changes all three passenger prices (adult, child, infant) and all persist", async () => {
        const pkg = await createPackageFixture()
        const variantIds = await getVariantIds(pkg.id)

        await api.post(
          `/admin/packages/${pkg.id}`,
          { prices: { adult: 1000, child: 500, infant: 150, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        const rawPrices = await getRawPrices(variantIds)
        const allAmounts = rawPrices
          .filter((p: any) => p.currency_code === "pen" || p.currency_code === "PEN")
          .map((p: any) => Number(p.amount))
          .sort()

        // The three new prices must all be present
        expect(allAmounts).toContain(1000)
        expect(allAmounts).toContain(500)
        expect(allAmounts).toContain(150)

        // The old prices (400, 200) must be gone for PEN
        const oldPrices = [400, 200].filter((old) => allAmounts.includes(old))
        expect(oldPrices.length).toBe(0)
      })
    })
  },
})