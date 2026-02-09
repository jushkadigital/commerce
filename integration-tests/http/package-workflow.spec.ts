import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { PACKAGE_MODULE } from "../../src/modules/package"
import PackageModuleService from "../../src/modules/package/service"
import { createPackageWorkflow, CreatePackageWorkflowInput } from "../../src/workflows/create-package"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("CreatePackageWorkflow", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let remoteLink: any
      let query: any

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        remoteLink = container.resolve("remoteLink")
        query = container.resolve("query")
      })

      describe("Basic Workflow Execution", () => {
        it("should create package with workflow and verify all entities created", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Machu Picchu",
            duration_days: 3,
            max_capacity: 10,
            description: "Amazing adventure to Machu Picchu",
            thumbnail: "https://example.com/machu-picchu.jpg",
            prices: {
              adult: 300,
              child: 250,
              infant: 0,
              currency_code: "PEN"
            }
          }

          const result = await createPackageWorkflow(container).run({ input })

          expect(result.result.package).toBeDefined()
          expect(result.result.package.id).toBeDefined()
          expect(result.result.package.destination).toBe("Machu Picchu")

          const createdPackage = result.result.package
          const product = createdPackage.product!

          expect(product.id).toBeDefined()
          expect(product.title).toBe("Machu Picchu - 3 Days")
          expect(product.status).toBe("published")

          const productWithVariants = await productModule.retrieveProduct(product.id, {
            relations: ["variants"]
          })

          expect(productWithVariants.variants).toBeDefined()
          expect(productWithVariants.variants.length).toBe(3)

          const variantTitles = productWithVariants.variants.map((v: any) => v.title)
          expect(variantTitles).toContain("Adult")
          expect(variantTitles).toContain("Child")
          expect(variantTitles).toContain("Infant")

          expect(createdPackage.variants).toBeDefined()
          expect(createdPackage.variants.length).toBe(3)

          const passengerTypes = createdPackage.variants.map((v: any) => v.passenger_type)
          expect(passengerTypes).toContain("adult")
          expect(passengerTypes).toContain("child")
          expect(passengerTypes).toContain("infant")

          createdPackage.variants.forEach((pv: any) => {
            expect(pv.product_variant).toBeDefined()
            expect(pv.product_variant.id).toBeDefined()
            expect(pv.variant_id).toBe(pv.product_variant.id)
          })

          await cleanupTestData(createdPackage, productWithVariants.variants)
        })

        it("should create package with default prices in USD", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Lima City Tour",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 100,
              child: 80,
              infant: 0
            }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          expect(createdPackage).toBeDefined()
          expect(createdPackage.destination).toBe("Lima City Tour")

          const product = createdPackage.product!

          const productWithVariants = await productModule.retrieveProduct(product.id, {
            relations: ["variants"]
          })

          expect(productWithVariants.variants.length).toBe(3)

          await cleanupTestData(createdPackage, productWithVariants.variants)
        })
      })

      describe("Package Fields Verification", () => {
        it("should create package with all default field values", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Cusco Sacred Valley",
            duration_days: 2,
            max_capacity: 15,
            prices: { adult: 200, child: 150, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const fullPackage = await packageModuleService.retrievePackage(createdPackage.id)

          expect(fullPackage.is_special).toBe(false)
          expect(fullPackage.blocked_dates).toEqual([])
          expect(fullPackage.blocked_week_days).toEqual([])
          expect(fullPackage.cancellation_deadline_hours).toBe(12)
          expect(fullPackage.booking_min_months_ahead).toBe(2)

          await cleanupTestData(createdPackage)
        })

        it("should verify key difference: Package uses months, not days (booking_min_months_ahead)", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Rainbow Mountain",
            duration_days: 1,
            max_capacity: 8,
            prices: { adult: 150, child: 120, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const fullPackage = await packageModuleService.retrievePackage(createdPackage.id)

          expect(fullPackage.booking_min_months_ahead).toBeDefined()
          expect(fullPackage.booking_min_months_ahead).toBe(2)
          expect(typeof fullPackage.booking_min_months_ahead).toBe("number")

          expect(fullPackage.duration_days).toBe(1)
          expect(fullPackage.booking_min_months_ahead).toBe(2)
          expect(fullPackage.duration_days).not.toBe(fullPackage.booking_min_months_ahead)

          await cleanupTestData(createdPackage)
        })
      })

      describe("Product Variant Structure", () => {
        it("should create product variants with correct SKUs and options", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Nazca Lines Flight",
            duration_days: 1,
            max_capacity: 12,
            prices: { adult: 350, child: 350, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package
          const product = createdPackage.product!

          const productWithDetails = await productModule.retrieveProduct(product.id, {
            relations: ["options", "variants"]
          })

          expect(productWithDetails.options).toBeDefined()
          expect(productWithDetails.options.length).toBe(1)
          expect(productWithDetails.options[0].title).toBe("Passenger Type")

          const variants = productWithDetails.variants
          const skuPrefix = "nazca-lines-flight"

          const adultVariant = variants.find((v: any) => v.title === "Adult")
          expect(adultVariant!.sku).toBe(`${skuPrefix}-ADULT`)
          expect(adultVariant!.manage_inventory).toBe(false)

          const childVariant = variants.find((v: any) => v.title === "Child")
          expect(childVariant!.sku).toBe(`${skuPrefix}-CHILD`)

          const infantVariant = variants.find((v: any) => v.title === "Infant")
          expect(infantVariant!.sku).toBe(`${skuPrefix}-INFANT`)

          await cleanupTestData(createdPackage, variants)
        })

        it("should create product variants with correct prices", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Lake Titicaca",
            duration_days: 2,
            max_capacity: 10,
            prices: { adult: 400, child: 300, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const productWithVariants = await productModule.retrieveProduct(createdPackage.product!.id, {
            relations: ["variants"]
          })

          const variants = productWithVariants.variants
          expect(variants.length).toBe(3)

          const adultVariant = variants.find((v: any) => v.title === "Adult")
          expect(adultVariant).toBeDefined()

          await cleanupTestData(createdPackage, variants)
        })
      })

      describe("Remote Links Verification", () => {
        it("should create remote links between package and product entities", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Amazon Jungle Expedition",
            duration_days: 5,
            max_capacity: 8,
            prices: { adult: 800, child: 600, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const { data: linkedPackages } = await query.graph({
            entity: "package",
            fields: ["id", "destination", "product.*"],
            filters: {
              id: createdPackage.id
            }
          })

          expect(linkedPackages).toHaveLength(1)
          expect(linkedPackages[0].product).toBeDefined()
          expect(linkedPackages[0].product.id).toBe(createdPackage.product!.id)

          await cleanupTestData(createdPackage)
        })

        it("should create remote links between package variants and product variants", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Colca Canyon Trek",
            duration_days: 3,
            max_capacity: 10,
            prices: { adult: 250, child: 200, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const { data: packageVariants } = await query.graph({
            entity: "package_variant",
            fields: ["id", "passenger_type", "product_variant.*"],
            filters: {
              package_id: createdPackage.id
            }
          })

          expect(packageVariants.length).toBe(3)

          packageVariants.forEach((pv: any) => {
            expect(pv.product_variant).toBeDefined()
            expect(pv.product_variant.id).toBeDefined()
          })

          await cleanupTestData(createdPackage)
        })
      })

      describe("Input Validation", () => {
        it("should handle destination with special characters in SKU generation", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Cusco & Sacred Valley (2026 Special!)",
            duration_days: 4,
            max_capacity: 12,
            prices: { adult: 500, child: 400, infant: 50 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const productWithVariants = await productModule.retrieveProduct(createdPackage.product!.id, {
            relations: ["variants"]
          })

          const variants = productWithVariants.variants
          const adultVariant = variants.find((v: any) => v.title === "Adult")

          expect(adultVariant!.sku).toMatch(/^[a-z0-9-]+-ADULT$/)

          await cleanupTestData(createdPackage, variants)
        })

      })

      describe("Package Model Fields", () => {
        it("should create package and verify all model fields are accessible", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Paracas National Reserve",
            description: "Explore the stunning Paracas National Reserve",
            duration_days: 2,
            max_capacity: 15,
            thumbnail: "https://example.com/paracas.jpg",
            prices: { adult: 220, child: 180, infant: 0 }
          }

          const result = await createPackageWorkflow(container).run({ input })
          const createdPackage = result.result.package

          const fullPackage = await packageModuleService.retrievePackage(createdPackage.id)

          expect(fullPackage.id).toBeDefined()
          expect(fullPackage.product_id).toBeDefined()
          expect(fullPackage.destination).toBe("Paracas National Reserve")
          expect(fullPackage.description).toBe("Explore the stunning Paracas National Reserve")
          expect(fullPackage.duration_days).toBe(2)
          expect(fullPackage.max_capacity).toBe(15)
          expect(fullPackage.thumbnail).toBe("https://example.com/paracas.jpg")

          expect(fullPackage.is_special).toBe(false)
          expect(Array.isArray(fullPackage.blocked_dates)).toBe(true)
          expect(Array.isArray(fullPackage.blocked_week_days)).toBe(true)
          expect(fullPackage.cancellation_deadline_hours).toBe(12)
          expect(fullPackage.booking_min_months_ahead).toBe(2)

          const packageWithRelations = await packageModuleService.retrievePackage(
            createdPackage.id,
            { relations: ["variants", "service_variants", "bookings"] }
          )

          expect(packageWithRelations.variants).toBeDefined()
          expect(packageWithRelations.variants.length).toBe(3)

          await cleanupTestData(createdPackage)
        })
      })

      async function cleanupTestData(pkg: any, productVariants: any[] = []) {
        try {
          if (pkg.variants && pkg.variants.length > 0) {
            await packageModuleService.deletePackageVariants(
              pkg.variants.map((v: any) => v.id)
            )
          }

          await packageModuleService.deletePackages(pkg.id)

          if (productVariants.length > 0) {
            for (const variant of productVariants) {
              await productModule.deleteProductVariants(variant.id)
            }
          } else if (pkg.product && pkg.product.variants) {
            for (const variant of pkg.product.variants) {
              await productModule.deleteProductVariants(variant.id)
            }
          }

          if (pkg.product) {
            await productModule.deleteProducts(pkg.product.id)
          }
        } catch (error) {
          console.error("Cleanup error:", error)
        }
      }
    })
  }
})
