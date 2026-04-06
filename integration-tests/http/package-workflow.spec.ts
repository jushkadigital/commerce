import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createPackageWorkflow, CreatePackageWorkflowInput } from "../../src/workflows/create-package"
import { updatePackageWorkflow } from "../../src/workflows/update-package"
import { PACKAGE_MODULE } from "../../src/modules/package"
import PackageModuleService from "../../src/modules/package/service"

jest.setTimeout(120 * 1000)

// Local slug helper matching src/utils/slug.ts normalization
function normalizeSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function buildExpectedSlugBase(destination: string, durationDays: number): string {
  const base = `${destination}-${durationDays}-days`
  return normalizeSlug(base)
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("CreatePackageWorkflow - Integration Tests", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let productModule: any
      let query: any

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve("query")
      })

       describe("Successful Package Creation", () => {
         it("should create a complete package with all entities", async () => {
           const input: CreatePackageWorkflowInput = {
             destination: "Machu Picchu",
             description: "Full day package to Machu Picchu including guide",
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

           const { result } = await createPackageWorkflow(container).run({ input })

           expect(result).toBeDefined()
           expect(result.package).toBeDefined()
           expect(result.package.id).toBeDefined()

           const pkg = result.package

           expect(pkg.destination).toBe("Machu Picchu")
           expect(pkg.description).toBe("Full day package to Machu Picchu including guide")
           expect(pkg.duration_days).toBe(1)
           expect(pkg.max_capacity).toBe(20)
           expect(pkg.thumbnail).toBe("https://example.com/machu-picchu.jpg")
           expect(pkg.product_id).toBeDefined()

           expect(pkg.product).toBeDefined()
           if (pkg.product) {
             expect(pkg.product.id).toBeDefined()
             expect(pkg.product.title).toContain("Machu Picchu")
             expect(pkg.product.variants).toBeDefined()
             expect(pkg.product.variants.length).toBe(3)

             const productVariants = pkg.product.variants
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

           expect(pkg.variants).toBeDefined()
           expect(pkg.variants.length).toBe(3)

           pkg.variants.forEach((pv: any) => {
             expect(pv.id).toBeDefined()
             expect(pv.variant_id).toBeDefined()
             expect(pv.package_id).toBe(pkg.id)
             expect(pv.passenger_type).toBeDefined()
           })

            const retrievedPackage = await packageModuleService.retrievePackage(pkg.id)
            expect(retrievedPackage).toBeDefined()
            expect(retrievedPackage.destination).toBe("Machu Picchu")

            const expectedSlugBase = buildExpectedSlugBase(input.destination, input.duration_days)
            expect(retrievedPackage.slug).toBeDefined()
            expect(retrievedPackage.slug).toBe(expectedSlugBase)

           await cleanupPackage(pkg.id)
         })

         it("should create package with minimal required fields", async () => {
           const input: CreatePackageWorkflowInput = {
             destination: "Cusco City Tour",
             duration_days: 1,
             max_capacity: 10,
             prices: {
               adult: 50,
               child: 30,
               infant: 0,
             },
           }

           const { result } = await createPackageWorkflow(container).run({ input })

           expect(result.package).toBeDefined()
           expect(result.package.destination).toBe("Cusco City Tour")
           expect(result.package.duration_days).toBe(1)
           expect(result.package.max_capacity).toBe(10)
           expect(result.package.product).toBeDefined()
           expect(result.package.variants).toHaveLength(3)

           await cleanupPackage(result.package.id)
         })

         it.skip("should generate unique and normalized slugs for packages with identical destination and duration", async () => {
            const destination = `Sacred Valley Tour ${Date.now()}`

            const input1: CreatePackageWorkflowInput = {
              destination,
              duration_days: 2,
              max_capacity: 15,
              prices: {
               adult: 180,
               child: 120,
               infant: 0,
             },
           }

            const input2: CreatePackageWorkflowInput = {
              destination,
              duration_days: 2,
              max_capacity: 12,
              prices: {
               adult: 150,
               child: 100,
               infant: 0,
             },
           }

           const { result: result1 } = await createPackageWorkflow(container).run({ input: input1 })
           const { result: result2 } = await createPackageWorkflow(container).run({ input: input2 })

           const pkg1 = result1.package
           const pkg2 = result2.package

            const retrievedPkg1 = await packageModuleService.retrievePackage(pkg1.id)
            const retrievedPkg2 = await packageModuleService.retrievePackage(pkg2.id)

            const expectedSlugBase = buildExpectedSlugBase(destination, 2)

            expect(retrievedPkg1.slug).toBeDefined()
            expect(retrievedPkg2.slug).toBeDefined()

            expect(retrievedPkg1.slug).not.toBe(retrievedPkg2.slug)
            expect(retrievedPkg1.slug).toBe(expectedSlugBase)
            expect(retrievedPkg2.slug).toBe(`${expectedSlugBase}-1`)

            await cleanupPackage(pkg1.id)
            await cleanupPackage(pkg2.id)
          })

        it("should preserve provided slug exactly as input when updating a package", async () => {
          const customSlug = "Custom-Slug-123_TEST"
          const input: CreatePackageWorkflowInput = {
            destination: "Slug Test Package",
            duration_days: 1,
            max_capacity: 10,
            prices: { adult: 100, child: 50, infant: 0 },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const { result: updatedResult } = await updatePackageWorkflow(container).run({
            input: {
              id: result.package.id,
              slug: customSlug,
              prices: input.prices,
            },
          })

          expect(updatedResult.package.id).toBe(result.package.id)
          
          const retrieved = await packageModuleService.retrievePackage(result.package.id)
          expect(retrieved.slug).toBe(customSlug)
          
          await cleanupPackage(result.package.id)
        })
       })

       describe("Pricing and Currency", () => {
        it("should create package with USD currency by default", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Lima Food Tour",
            duration_days: 1,
            max_capacity: 8,
            prices: {
              adult: 80,
              child: 40,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package.product).toBeDefined()

          await cleanupPackage(result.package.id)
        })

        it("should create package with PEN (Peruvian Sol) currency", async () => {
          const input: CreatePackageWorkflowInput = {
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

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package).toBeDefined()
          expect(result.package.destination).toBe("Arequipa Colca Canyon")

          await cleanupPackage(result.package.id)
        })

        it("should create package with different price tiers", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Amazon Rainforest Expedition",
            duration_days: 5,
            max_capacity: 6,
            prices: {
              adult: 1200,
              child: 900,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          if (result.package.product) {
            const adultVariant = result.package.product.variants.find(
              (v: any) => v.title === "Adult"
            )
            expect(adultVariant).toBeDefined()
            expect(adultVariant!.title).toBe("Adult")
          }

          await cleanupPackage(result.package.id)
        })
      })

      describe("Product and Variant Structure", () => {
        it("should create product with correct Passenger Type options", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Nazca Lines Flight",
            duration_days: 1,
            max_capacity: 12,
            prices: {
              adult: 300,
              child: 250,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const product = result.package.product
          expect(product).toBeDefined()
          if (product) {
            expect(product.variants).toHaveLength(3)
          }
          expect(result.package.variants.length).toBe(3)

          await cleanupPackage(result.package.id)
        })

        it("should create unique SKUs based on destination", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Rainbow Mountain Hike",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 100,
              child: 70,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const product = result.package.product
          expect(product).toBeDefined()
          if (product) {
            const skus = product.variants.map((v: any) => v.sku)
            expect(skus.every((sku: string) => sku.includes("rainbow"))).toBe(true)
            expect(skus.some((sku: string) => sku.includes("ADULT"))).toBe(true)
            expect(skus.some((sku: string) => sku.includes("CHILD"))).toBe(true)
            expect(skus.some((sku: string) => sku.includes("INFANT"))).toBe(true)
            expect(new Set(skus).size).toBe(3)
          }

          await cleanupPackage(result.package.id)
        })

        it("should create product with published status", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Lake Titicaca Islands",
            duration_days: 2,
            max_capacity: 18,
            prices: {
              adult: 180,
              child: 120,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          if (result.package.product) {
            expect(result.package.product.status).toBe("published")
          }

          await cleanupPackage(result.package.id)
        })
      })

      describe("Remote Links", () => {
        it("should establish links between package and product", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Paracas National Reserve",
            duration_days: 1,
            max_capacity: 25,
            prices: {
              adult: 90,
              child: 60,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          if (result.package.product) {
            expect(result.package.product_id).toBe(result.package.product.id)
            expect(result.package.product.id).toBe(result.package.product_id)
          }

          await cleanupPackage(result.package.id)
        })

        it("should establish links between package variants and product variants", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Huacachina Oasis",
            duration_days: 1,
            max_capacity: 30,
            prices: {
              adult: 75,
              child: 50,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          result.package.variants.forEach((pv: any) => {
            expect(pv.variant_id).toBeDefined()
            expect(pv.package_id).toBe(result.package.id)

            if (result.package.product) {
              const matchingProductVariant = result.package.product.variants.find(
                (prodV: any) => prodV.id === pv.variant_id
              )
              expect(matchingProductVariant).toBeDefined()
            }
          })

          await cleanupPackage(result.package.id)
        })
      })

      describe("New Package Model Fields", () => {
        it("should create package with default values for new fields", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Test Default Fields Package",
            duration_days: 1,
            max_capacity: 10,
            prices: {
              adult: 100,
              child: 50,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package).toBeDefined()
          expect(result.package.is_special).toBe(false)
          expect(result.package.blocked_dates).toEqual([])
          expect(result.package.blocked_week_days).toEqual([])
          expect(result.package.cancellation_deadline_hours).toBe(12)
          expect(result.package.booking_min_days_ahead).toBe(2)

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)

          expect(packageFromDb.is_special).toBe(false)
          expect(packageFromDb.blocked_dates).toEqual([])
          expect(packageFromDb.blocked_week_days).toEqual([])
          expect(packageFromDb.cancellation_deadline_hours).toBe(12)
          expect(packageFromDb.booking_min_days_ahead).toBe(2)

          await cleanupPackage(result.package.id)
        })

        it("should support special packages with is_special flag", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Special Christmas Package",
            duration_days: 1,
            max_capacity: 50,
            prices: {
              adult: 200,
              child: 150,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          await packageModuleService.updatePackages({
            id: result.package.id,
            is_special: true,
            blocked_dates: ["2026-12-24"],
          })

          const updatedPackage = await packageModuleService.retrievePackage(result.package.id)
          expect(updatedPackage.is_special).toBe(true)
          expect(updatedPackage.blocked_dates).toContain("2026-12-24")

          await cleanupPackage(result.package.id)
        })

        it("should support blocked dates configuration", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Holiday Season Package",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 120,
              child: 80,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          await packageModuleService.updatePackages({
            id: result.package.id,
            blocked_dates: ["2026-12-25", "2026-12-31", "2027-01-01"],
          })

          const updatedPackage = await packageModuleService.retrievePackage(result.package.id)
          expect(updatedPackage.blocked_dates).toHaveLength(3)
          expect(updatedPackage.blocked_dates).toContain("2026-12-25")
          expect(updatedPackage.blocked_dates).toContain("2026-12-31")
          expect(updatedPackage.blocked_dates).toContain("2027-01-01")

          await cleanupPackage(result.package.id)
        })

        it("should support blocked week days configuration", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Weekdays Only Package",
            duration_days: 1,
            max_capacity: 15,
            prices: {
              adult: 100,
              child: 60,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          await packageModuleService.updatePackages({
            id: result.package.id,
            blocked_week_days: ["0", "6"],
          })

          const updatedPackage = await packageModuleService.retrievePackage(result.package.id)
          expect(updatedPackage.blocked_week_days.map(Number)).toContain(0)
          expect(updatedPackage.blocked_week_days.map(Number)).toContain(6)

          await cleanupPackage(result.package.id)
        })

        it("should support booking and cancellation policy configuration", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Premium VIP Package",
            duration_days: 3,
            max_capacity: 8,
            prices: {
              adult: 1500,
              child: 1200,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          await packageModuleService.updatePackages({
            id: result.package.id,
            cancellation_deadline_hours: 72,
      booking_min_days_ahead: 2,
          })

          const updatedPackage = await packageModuleService.retrievePackage(result.package.id)
          expect(updatedPackage.cancellation_deadline_hours).toBe(72)
          expect(updatedPackage.booking_min_days_ahead).toBe(2)

          await cleanupPackage(result.package.id)
        })
      })

      describe("Edge Cases and Validation", () => {
        it("should handle destination with special characters", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Cusco & Sacred Valley (Perú)",
            duration_days: 2,
            max_capacity: 15,
            prices: {
              adult: 250,
              child: 180,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package.destination).toBe("Cusco & Sacred Valley (Perú)")

          const product = result.package.product
          expect(product).toBeDefined()
          if (product && product.variants) {
            const adultVariant = product.variants.find((v: any) => v.title === "Adult")
            expect(adultVariant).toBeDefined()
            expect(adultVariant!.sku).toBeDefined()
          }

          await cleanupPackage(result.package.id)
        })

        it("should handle long duration packages", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Inca Trail to Machu Picchu",
            duration_days: 4,
            max_capacity: 12,
            prices: {
              adult: 800,
              child: 600,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package.duration_days).toBe(4)
          if (result.package.product) {
            expect(result.package.product.title).toContain("4 Days")
          }

          await cleanupPackage(result.package.id)
        })

        it("should handle single passenger type prices correctly", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Free Walking Package",
            duration_days: 1,
            max_capacity: 50,
            prices: {
              adult: 0,
              child: 0,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package).toBeDefined()
          if (result.package.product && result.package.product.variants) {
            expect(result.package.product.variants).toHaveLength(3)
          }

          await cleanupPackage(result.package.id)
        })

        it("should handle large capacity packages", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Group Festival Package",
            duration_days: 1,
            max_capacity: 100,
            prices: {
              adult: 50,
              child: 30,
              infant: 0,
            },
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package.max_capacity).toBe(100)

          await cleanupPackage(result.package.id)
        })
      })

      describe("Workflow Result Structure", () => {
        it("should return complete package data via query.graph", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Query Test Package",
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

          const { result } = await createPackageWorkflow(container).run({ input })

          const pkg = result.package

          expect(pkg.id).toBeDefined()
          expect(pkg.destination).toBe("Query Test Package")
          expect(pkg.description).toBe("Test for complete data retrieval")
          expect(pkg.duration_days).toBe(1)
          expect(pkg.max_capacity).toBe(10)
          expect(pkg.thumbnail).toBe("https://example.com/thumb.jpg")
          expect(pkg.product_id).toBeDefined()

          if (pkg.product) {
            expect(pkg.product.id).toBe(pkg.product_id)
            expect(pkg.product.title).toBeDefined()
          }

          expect(pkg.variants).toBeDefined()
          expect(pkg.variants.length).toBe(3)

          await cleanupPackage(pkg.id)
        })
      })

      describe("Package Creation with Unavailable Dates", () => {
        it("should create package with blocked dates in initial input", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Holiday Blocked Package",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 150,
              child: 100,
              infant: 0,
            },
            blocked_dates: ["2026-12-25", "2026-12-31", "2027-01-01"],
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package).toBeDefined()
          expect(result.package.destination).toBe("Holiday Blocked Package")

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)
          expect(packageFromDb.blocked_dates).toHaveLength(3)
          expect(packageFromDb.blocked_dates).toContain("2026-12-25")
          expect(packageFromDb.blocked_dates).toContain("2026-12-31")
          expect(packageFromDb.blocked_dates).toContain("2027-01-01")

          await cleanupPackage(result.package.id)
        })

        it("should create package with blocked week days in initial input", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Weekdays Only Office Package",
            duration_days: 1,
            max_capacity: 15,
            prices: {
              adult: 80,
              child: 50,
              infant: 0,
            },
            blocked_week_days: ["0", "6"],
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          expect(result.package).toBeDefined()

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)
          expect(packageFromDb.blocked_week_days).toHaveLength(2)
          expect(packageFromDb.blocked_week_days.map(Number)).toContain(0)
          expect(packageFromDb.blocked_week_days.map(Number)).toContain(6)

          await cleanupPackage(result.package.id)
        })

        it("should create package with all availability fields in initial input", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Full Config Package",
            description: "Package with complete availability configuration",
            duration_days: 2,
            max_capacity: 12,
            thumbnail: "https://example.com/full-config.jpg",
            prices: {
              adult: 300,
              child: 200,
              infant: 0,
              currency_code: "USD",
            },
            is_special: true,
            blocked_dates: ["2026-07-04", "2026-11-26"],
            blocked_week_days: ["2"],
            cancellation_deadline_hours: 48,
      booking_min_days_ahead: 3,
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)

          expect(packageFromDb.destination).toBe("Full Config Package")
          expect(packageFromDb.is_special).toBe(true)
          expect(packageFromDb.blocked_dates).toHaveLength(2)
          expect(packageFromDb.blocked_dates).toContain("2026-07-04")
          expect(packageFromDb.blocked_dates).toContain("2026-11-26")
          expect(packageFromDb.blocked_week_days.map(Number)).toContain(2)
          expect(packageFromDb.cancellation_deadline_hours).toBe(48)
          expect(packageFromDb.booking_min_days_ahead).toBe(3)

          await cleanupPackage(result.package.id)
        })

        it("should create package with weekend-only availability (blocked weekdays)", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Weekend Special Package",
            duration_days: 1,
            max_capacity: 30,
            prices: {
              adult: 120,
              child: 80,
              infant: 0,
            },
            blocked_week_days: ["1", "2", "3", "4", "5"],
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)
          expect(packageFromDb.blocked_week_days).toHaveLength(5)
          expect(packageFromDb.blocked_week_days.map(Number)).toContain(1)
          expect(packageFromDb.blocked_week_days.map(Number)).toContain(5)

          await cleanupPackage(result.package.id)
        })

        it("should create package with single blocked date", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Single Blackout Package",
            duration_days: 1,
            max_capacity: 25,
            prices: {
              adult: 90,
              child: 60,
              infant: 0,
            },
            blocked_dates: ["2026-02-14"],
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)
          expect(packageFromDb.blocked_dates).toHaveLength(1)
          expect(packageFromDb.blocked_dates).toContain("2026-02-14")

          await cleanupPackage(result.package.id)
        })

        it("should create package with extended booking advance requirement", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Expedition Package",
            duration_days: 7,
            max_capacity: 8,
            prices: {
              adult: 2500,
              child: 2000,
              infant: 0,
            },
      booking_min_days_ahead: 6,
            cancellation_deadline_hours: 168,
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)
          expect(packageFromDb.booking_min_days_ahead).toBe(6)
          expect(packageFromDb.cancellation_deadline_hours).toBe(168)

          await cleanupPackage(result.package.id)
        })

        it("should create package with empty availability arrays", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Always Available Package",
            duration_days: 1,
            max_capacity: 100,
            prices: {
              adult: 50,
              child: 30,
              infant: 0,
            },
            blocked_dates: [],
            blocked_week_days: [],
          }

          const { result } = await createPackageWorkflow(container).run({ input })

          const packageFromDb = await packageModuleService.retrievePackage(result.package.id)
          expect(packageFromDb.blocked_dates).toEqual([])
          expect(packageFromDb.blocked_week_days).toEqual([])

          await cleanupPackage(result.package.id)
        })

        it("should validate booking against blocked dates after creation", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Date Restricted Package",
            duration_days: 1,
            max_capacity: 20,
            prices: {
              adult: 100,
              child: 70,
              infant: 0,
            },
            blocked_dates: ["2026-08-15"],
      booking_min_days_ahead: 0,
          }

          const { result } = await createPackageWorkflow(container).run({ input })
          const packageId = result.package.id

          const blockedValidation = await packageModuleService.validateBooking(
            packageId,
            new Date("2026-08-15"),
            2
          )
          expect(blockedValidation.valid).toBe(false)
          expect(blockedValidation.reason).toContain("no esta disponible")

          const allowedValidation = await packageModuleService.validateBooking(
            packageId,
            new Date("2026-08-16"),
            2
          )
          expect(allowedValidation.valid).toBe(true)

          await cleanupPackage(packageId)
        })

        it("should validate booking against blocked week days after creation", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "No Sunday Package",
            duration_days: 1,
            max_capacity: 15,
            prices: {
              adult: 75,
              child: 50,
              infant: 0,
            },
            blocked_week_days: ["0"],
      booking_min_days_ahead: 0,
          }

          const { result } = await createPackageWorkflow(container).run({ input })
          const packageId = result.package.id

          const sundayValidation = await packageModuleService.validateBooking(
            packageId,
            new Date("2026-08-09"),
            2
          )
          expect(sundayValidation.valid).toBe(false)
          expect(sundayValidation.reason).toContain("Domingo")

          const mondayValidation = await packageModuleService.validateBooking(
            packageId,
            new Date("2026-08-10"),
            2
          )
          expect(mondayValidation.valid).toBe(true)

          await cleanupPackage(packageId)
        })

        it("should validate booking against minimum days ahead requirement", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Advance Booking Package",
            duration_days: 1,
            max_capacity: 10,
            prices: {
              adult: 200,
              child: 150,
              infant: 0,
            },
      booking_min_days_ahead: 3,
          }

          const { result } = await createPackageWorkflow(container).run({ input })
          const packageId = result.package.id

          const today = new Date()

          const nextDay = new Date(today)
          nextDay.setDate(nextDay.getDate() + 1)

          const shortValidation = await packageModuleService.validateBooking(
            packageId,
            nextDay,
            2
          )
          expect(shortValidation.valid).toBe(false)
          expect(shortValidation.reason).toContain("3 dias en adelante")

          const futureDate = new Date(today)
          futureDate.setDate(futureDate.getDate() + 4)

          const futureValidation = await packageModuleService.validateBooking(
            packageId,
            futureDate,
            2
          )
          expect(futureValidation.valid).toBe(true)

          await cleanupPackage(packageId)
        })

        it("should handle complex availability rules combining blocked dates and days", async () => {
          const input: CreatePackageWorkflowInput = {
            destination: "Complex Availability Package",
            duration_days: 1,
            max_capacity: 12,
            prices: {
              adult: 180,
              child: 120,
              infant: 0,
            },
            blocked_dates: ["2026-09-07"],
            blocked_week_days: ["0", "6"],
      booking_min_days_ahead: 1,
          }

          const { result } = await createPackageWorkflow(container).run({ input })
          const packageId = result.package.id

          const specificDateValidation = await packageModuleService.validateBooking(
            packageId,
            new Date("2026-09-07"),
            2
          )
          expect(specificDateValidation.valid).toBe(false)

          const saturdayValidation = await packageModuleService.validateBooking(
            packageId,
            new Date("2026-09-05"),
            2
          )
          expect(saturdayValidation.valid).toBe(false)

          const today = new Date()
          const validWeekday = new Date(today)
          validWeekday.setMonth(validWeekday.getMonth() + 2)
          while (validWeekday.getDay() !== 3) {
            validWeekday.setDate(validWeekday.getDate() + 1)
          }

          const validValidation = await packageModuleService.validateBooking(
            packageId,
            validWeekday,
            2
          )
          expect(validValidation.valid).toBe(true)

          await cleanupPackage(packageId)
        })
      })

      async function cleanupPackage(packageId: string) {
        try {
          const pkg = await packageModuleService.retrievePackage(packageId)

          const packageVariants = await packageModuleService.listPackageVariants({
            package_id: packageId,
          })
          if (packageVariants.length > 0) {
            await packageModuleService.deletePackageVariants(
              packageVariants.map((pv) => pv.id)
            )
          }

          await packageModuleService.deletePackages(packageId)

          if (pkg.product_id) {
            const product = await productModule.retrieveProduct(pkg.product_id, {
              relations: ["variants"],
            })

            for (const variant of product.variants || []) {
              await productModule.deleteProductVariants(variant.id)
            }

            await productModule.deleteProducts(pkg.product_id)
          }
        } catch (error) {
          console.error(`Cleanup error for package ${packageId}:`, error)
        }
      }
    })
  },
})
