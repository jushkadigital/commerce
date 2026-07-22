import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PACKAGE_MODULE } from "../../src/modules/package"
import { EVENTS_MODULE } from "../../src/modules/events"
import PackageModuleService from "../../src/modules/package/service"
import packageCreatedSubscriber from "../../src/subscribers/packageCreated"

jest.setTimeout(180_000)

function buildCmsPackagePayload(testId: number, destination: string) {
  return {
    id: testId,
    slug: `test-package-${testId}`,
    data: {
      destination,
      description: {
        root: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Package created from CMS event test" }] },
          ],
        },
      },
      duration_days: 3,
      max_capacity: 20,
      thumbnail: "https://example.com/test-package.jpg",
      price: 350,
      destinos: [{ name: "Cusco" }, { name: "Puno" }],
      difficulty: "medium",
    },
  }
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("CMS Package Create Flow — subscriber creates package from integration.package.published.v1", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let query: any
      let publishSpy: jest.SpyInstance
      let createdPackageIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
      })

      beforeEach(async () => {
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

      async function getPackageByPayloadId(payloadId: string): Promise<any | null> {
        const packages = await packageModuleService.listPackages({ metadata: { payloadId } }, { take: 10 })
        return (packages && packages.length > 0) ? packages[0] : null
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

      // CASO 1: subscriber recibe package.published.v1 → crea package con product + variants + precios
      it("receives integration.package.published.v1, creates package via workflow, and publishes package.published event", async () => {
        const testId = Date.now()
        const payloadId = `${testId}package`
        const destination = `CMS Create Test Package ${testId}`
        const cmsPayload = buildCmsPackagePayload(testId, destination)

        publishSpy.mockClear()

        // Invoke the subscriber handler directly with a mock event
        await packageCreatedSubscriber({
          event: { name: "integration.package.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        // Verify the package was created
        const pkg = await getPackageByPayloadId(payloadId)
        expect(pkg).not.toBeNull()
        expect(pkg.destination).toBe(destination)
        expect(pkg.duration_days).toBe(3)
        // The workflow generates its own slug from destination + duration, not from the CMS slug field
        expect(pkg.slug).toBeDefined()
        expect(pkg.product_id).toBeDefined()
        createdPackageIds.push(pkg.id)

        // Verify the subscriber published the package.published integration event
        const publishedCall = publishSpy.mock.calls.find(
          (c: any[]) => c[0]?.aggregateType === "package" && c[0]?.action === "published"
        )
        expect(publishedCall).toBeDefined()
        expect(publishedCall[0].payload.id).toBe(pkg.id)
        expect(publishedCall[0].payload.productId).toBe(pkg.product_id)
        expect(publishedCall[0].payload.destination).toBe(destination)

        // Verify the product was created with the right title
        const product = await productModule.retrieveProduct(pkg.product_id)
        expect(product.title).toContain(destination)

        // Verify variants exist (adult, child, infant)
        const productWithVariants = await productModule.retrieveProduct(pkg.product_id, { relations: ["variants"] })
        expect(productWithVariants.variants.length).toBe(3)
      })

      // CASO 2: subscriber con payload mínimo → crea package correctamente
      it("creates a package from minimal CMS payload via subscriber", async () => {
        const testId = Date.now() + 1
        const payloadId = `${testId}package`
        const cmsPayload = {
          id: testId,
          slug: `test-package-${testId}`,
          data: {
            destination: `Minimal CMS Package ${testId}`,
            description: { root: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Minimal" }] }] } },
            duration_days: 1,
            max_capacity: 5,
            thumbnail: "",
            price: 100,
            destinos: [{ name: "" }],
            difficulty: "",
          },
        }

        publishSpy.mockClear()

        await packageCreatedSubscriber({
          event: { name: "integration.package.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        const pkg = await getPackageByPayloadId(payloadId)
        expect(pkg).not.toBeNull()
        expect(pkg.product_id).toBeDefined()
        createdPackageIds.push(pkg.id)

        const publishedCall = publishSpy.mock.calls.find(
          (c: any[]) => c[0]?.aggregateType === "package" && c[0]?.action === "published"
        )
        expect(publishedCall).toBeDefined()
      })

      // CASO 3: subscriber con el mismo evento duplicado → el workflow de package no crea un duplicado
      it("does not create a duplicate package when the same CMS event is processed twice", async () => {
        const testId = Date.now() + 2
        const payloadId = `${testId}package`
        const cmsPayload = buildCmsPackagePayload(testId, `Dedup Test Package ${testId}`)

        publishSpy.mockClear()

        // Invoke subscriber once — creates the first package
        await packageCreatedSubscriber({
          event: { name: "integration.package.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any)

        let packages = await packageModuleService.listPackages({ metadata: { payloadId } }, { take: 10 })
        expect(packages.length).toBe(1)
        createdPackageIds.push(packages[0].id)

        // Invoke subscriber again — the workflow does not create a duplicate
        // (the product handle already exists; the workflow handles the collision without creating)
        await packageCreatedSubscriber({
          event: { name: "integration.package.published.v1", data: cmsPayload, metadata: {} },
          container,
        } as any).catch(() => {
          // The workflow may throw or resolve — either way, no duplicate should be created
        })

        packages = await packageModuleService.listPackages({ metadata: { payloadId } }, { take: 10 })
        expect(packages.length).toBe(1)
      })
    })
  },
})