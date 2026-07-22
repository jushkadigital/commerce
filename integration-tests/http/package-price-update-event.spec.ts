import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sign } from "jsonwebtoken"
import { createPackageWorkflow, CreatePackageWorkflowInput } from "../../src/workflows/create-package"
import { PACKAGE_MODULE } from "../../src/modules/package"
import { EVENTS_MODULE } from "../../src/modules/events"
import PackageModuleService from "../../src/modules/package/service"

jest.setTimeout(180_000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/packages/:id — price update & integration event", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let publishSpy: jest.SpyInstance
      let createdPackageIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
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
          first_name: "Package",
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

      async function createPackageFixture(overrides: Partial<CreatePackageWorkflowInput> = {}): Promise<any> {
        const input: CreatePackageWorkflowInput = {
          destination: "Price Test Package",
          description: "Package for price update tests",
          duration_days: 2,
          max_capacity: 10,
          prices: { adult: 400, child: 200, infant: 0, currency_code: "PEN" },
          ...overrides,
        }
        const { result } = await createPackageWorkflow(container).run({ input })
        createdPackageIds.push(result.package.id)
        return result.package
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

      // CASO 1: actualizar precios → publica integration.product.updated.v1
      it("updates prices via POST /admin/packages/:id and publishes integration.product.updated.v1", async () => {
        const pkg = await createPackageFixture()
        const variantIds = (await packageModuleService.retrievePackage(pkg.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        publishSpy.mockClear()

        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { prices: { adult: 600, child: 300, infant: 80, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        expect(response.status).toBe(200)
        expect(response.data.package).toBeDefined()

        expect(publishSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "integration",
            aggregateType: "product",
            action: "updated",
            version: 1,
          })
        )

        const callArgs = publishSpy.mock.calls.find(
          (c: any[]) => c[0]?.action === "updated" && c[0]?.aggregateType === "product"
        )
        expect(callArgs).toBeDefined()
        expect(callArgs[0].payload.id).toBe(pkg.product_id)

        const variantsWithPrices = await getVariantPrices(variantIds)
        const hasNewPrice = variantsWithPrices.some((v: any) =>
          (v.price_set?.prices || []).some((p: any) => Number(p.amount) === 600)
        )
        expect(hasNewPrice).toBe(true)
      })

      // CASO 2: actualizar sin prices → NO zeroea precios y NO publica evento updated
      it("updates package fields without prices and does NOT zero prices or publish an integration event", async () => {
        const pkg = await createPackageFixture()
        const variantIds = (await packageModuleService.retrievePackage(pkg.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        const beforeVariants = await getVariantPrices(variantIds)
        const beforeAdultPrice = beforeVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .find((p: any) => Number(p.amount) === 400)
        expect(beforeAdultPrice).toBeDefined()

        publishSpy.mockClear()

        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { destination: "Updated Price Test Package" },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        const productUpdatedCalls = publishSpy.mock.calls.filter(
          (c: any[]) => c[0]?.aggregateType === "product" && c[0]?.action === "updated"
        )
        expect(productUpdatedCalls.length).toBe(0)

        const afterVariants = await getVariantPrices(variantIds)
        const afterAdultPrice = afterVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .find((p: any) => Number(p.amount) === 400)
        expect(afterAdultPrice).toBeDefined()
      })

      // CASO 3: actualizar destination → sincroniza product.title sin tocar precios
      it("updates destination and syncs product title without changing prices", async () => {
        const pkg = await createPackageFixture()
        const variantIds = (await packageModuleService.retrievePackage(pkg.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        const beforeVariants = await getVariantPrices(variantIds)
        const initialPriceAmounts = beforeVariants
          .flatMap((v: any) => v.price_set?.prices || [])
          .map((p: any) => Number(p.amount))
          .sort()

        publishSpy.mockClear()

        const newDestination = "Synced Destination Package"
        const response = await api.post(
          `/admin/packages/${pkg.id}`,
          { destination: newDestination, duration_days: 5 },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        const product = await productModule.retrieveProduct(pkg.product_id)
        expect(product.title).toContain(newDestination)
        expect(product.title).toContain("5 Days")

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