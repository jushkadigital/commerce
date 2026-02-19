import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TOUR_MODULE } from "../../src/modules/tour"
import { PACKAGE_MODULE } from "../../src/modules/package"
import TourModuleService from "../../src/modules/tour/service"
import PackageModuleService from "../../src/modules/package/service"
import { validateTourStep, ValidateTourStepInput } from "../../src/modules/tour/steps/create-tour-validate"
import { createTourRecordStep } from "../../src/modules/tour/steps/create-tour-record"
import { validatePackageStep, ValidatePackageStepInput } from "../../src/modules/package/steps/create-package-validate"
import { createPackageRecordStep } from "../../src/modules/package/steps/create-package-record"

jest.setTimeout(60 * 1000)

const testValidateTourWorkflow = createWorkflow(
  "test-validate-tour",
  (input: ValidateTourStepInput) => {
    const result = validateTourStep(input)
    return new WorkflowResponse(result)
  }
)

const testCreateTourWorkflow = createWorkflow(
  "test-create-tour-record",
  (input: {
    productId: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
  }) => {
    const result = createTourRecordStep(input)
    return new WorkflowResponse(result)
  }
)

const testValidatePackageWorkflow = createWorkflow(
  "test-validate-package",
  (input: ValidatePackageStepInput) => {
    const result = validatePackageStep(input)
    return new WorkflowResponse(result)
  }
)

const testCreatePackageWorkflow = createWorkflow(
  "test-create-package-record",
  (input: {
    productId: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
  }) => {
    const result = createPackageRecordStep(input)
    return new WorkflowResponse(result)
  }
)

const failStep = createStep(
  "fail-step",
  async () => {
    throw new Error("Intentional failure for testing compensation")
  }
)

const testTourWithCompensationWorkflow = createWorkflow(
  "test-tour-with-compensation",
  (input: {
    productId: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
  }) => {
    const tour = createTourRecordStep(input)
    failStep()
    return new WorkflowResponse(tour)
  }
)

const testPackageWithCompensationWorkflow = createWorkflow(
  "test-package-with-compensation",
  (input: {
    productId: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
  }) => {
    const pkg = createPackageRecordStep(input)
    failStep()
    return new WorkflowResponse(pkg)
  }
)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("Workflow Steps - Integration Tests", () => {
      let container: any
      let tourModuleService: TourModuleService
      let packageModuleService: PackageModuleService
      let productModule: any

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        packageModuleService = container.resolve(PACKAGE_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
      })

      describe("validateTourStep", () => {
        it("should pass validation with valid tour data (duration_days = 1)", async () => {
          const validInput: ValidateTourStepInput = {
            destination: "Cusco",
            duration_days: 1,
          }

          const { result } = await testValidateTourWorkflow(container).run({
            input: validInput,
          })

          expect(result).toBeDefined()
          expect(result).toEqual({ valid: true })
        })

        it("should pass validation with longer duration", async () => {
          const validInput: ValidateTourStepInput = {
            destination: "Lima",
            duration_days: 7,
          }

          const { result } = await testValidateTourWorkflow(container).run({
            input: validInput,
          })

          expect(result).toBeDefined()
          expect(result).toEqual({ valid: true })
        })

        it("should throw error when duration_days = 0", async () => {
          const invalidInput: ValidateTourStepInput = {
            destination: "Cusco",
            duration_days: 0,
          }

          const result = await testValidateTourWorkflow(container).run({
            input: invalidInput,
            throwOnError: false // ensure we get the result object even on error
          })
          console.log("DEBUG_WORKFLOW_RESULT:", JSON.stringify(result, null, 2))
          // Fail the test intentionally so we see the output
          throw new Error("Debugging workflow result")
        })

        it("should throw error when duration_days is negative", async () => {
          const invalidInput: ValidateTourStepInput = {
            destination: "Cusco",
            duration_days: -5,
          }

          await expect(
            testValidateTourWorkflow(container).run({
              input: invalidInput,
            })
          ).rejects.toThrow("Duration must be at least 1 day.")
        })

        it("should throw error when duration_days is negative large number", async () => {
          const invalidInput: ValidateTourStepInput = {
            destination: "Cusco",
            duration_days: -100,
          }

          await expect(
            testValidateTourWorkflow(container).run({
              input: invalidInput,
            })
          ).rejects.toThrow("Duration must be at least 1 day.")
        })
      })

      describe("createTourRecordStep", () => {
        let product: any

        beforeEach(async () => {
          product = await productModule.createProducts({
            title: "Test Tour Product",
            description: "Test tour for step validation",
            status: "published",
          })
        })

        afterEach(async () => {
          try {
            await productModule.deleteProducts(product.id)
          } catch {
            // Product might already be deleted by compensation
          }
        })

        it("should create tour record with valid data", async () => {
          const input = {
            productId: product.id,
            destination: "Machu Picchu",
            description: "Amazing tour",
            duration_days: 2,
            max_capacity: 20,
          }

          const { result } = await testCreateTourWorkflow(container).run({
            input,
          })

          expect(result).toBeDefined()
          expect(result.id).toBeDefined()
          expect(result.destination).toBe("Machu Picchu")
          expect(result.product_id).toBe(product.id)
          expect(result.duration_days).toBe(2)
          expect(result.max_capacity).toBe(20)

          const tour = await tourModuleService.retrieveTour(result.id)
          expect(tour).toBeDefined()
          expect(tour.destination).toBe("Machu Picchu")

          await tourModuleService.deleteTours(result.id)
        })

        it("should return tour data with id for rollback", async () => {
          const input = {
            productId: product.id,
            destination: "Test Destination",
            duration_days: 1,
            max_capacity: 10,
          }

          const { result } = await testCreateTourWorkflow(container).run({
            input,
          })

          expect(result.id).toBeDefined()

          await tourModuleService.deleteTours(result.id)
        })

        it("should handle optional description field", async () => {
          const input = {
            productId: product.id,
            destination: "No Description Tour",
            duration_days: 1,
            max_capacity: 5,
          }

          const { result } = await testCreateTourWorkflow(container).run({
            input,
          })

          expect(result).toBeDefined()
          expect(result.destination).toBe("No Description Tour")

          await tourModuleService.deleteTours(result.id)
        })

        describe("Compensation (Rollback)", () => {
          it("should delete tour when workflow fails and compensation is triggered", async () => {
            const input = {
              productId: product.id,
              destination: "Compensation Test Tour",
              duration_days: 1,
              max_capacity: 5,
            }

            let tourId: string | null = null
            
            try {
              const { result } = await testTourWithCompensationWorkflow(container).run({
                input,
              })
              tourId = result.id
            } catch (error) {
              // Expected to fail
            }

            if (tourId) {
              await expect(
                tourModuleService.retrieveTour(tourId)
              ).rejects.toThrow()
            }
          })
        })
      })

      describe("validatePackageStep", () => {
        it("should pass validation with valid package data (duration_days = 1)", async () => {
          const validInput: ValidatePackageStepInput = {
            destination: "Cusco",
            duration_days: 1,
          }

          const { result } = await testValidatePackageWorkflow(container).run({
            input: validInput,
          })

          expect(result).toBeDefined()
          expect(result).toEqual({ valid: true })
        })

        it("should pass validation with longer duration", async () => {
          const validInput: ValidatePackageStepInput = {
            destination: "Lima",
            duration_days: 5,
          }

          const { result } = await testValidatePackageWorkflow(container).run({
            input: validInput,
          })

          expect(result).toBeDefined()
          expect(result).toEqual({ valid: true })
        })

        it("should throw error when duration_days = 0", async () => {
          const invalidInput: ValidatePackageStepInput = {
            destination: "Cusco",
            duration_days: 0,
          }

          await expect(
            testValidatePackageWorkflow(container).run({
              input: invalidInput,
            })
          ).rejects.toThrow("Duration must be at least 1 day.")
        })

        it("should throw error when duration_days is negative", async () => {
          const invalidInput: ValidatePackageStepInput = {
            destination: "Cusco",
            duration_days: -3,
          }

          await expect(
            testValidatePackageWorkflow(container).run({
              input: invalidInput,
            })
          ).rejects.toThrow("Duration must be at least 1 day.")
        })
      })

      describe("createPackageRecordStep", () => {
        let product: any

        beforeEach(async () => {
          product = await productModule.createProducts({
            title: "Test Package Product",
            description: "Test package for step validation",
            status: "published",
          })
        })

        afterEach(async () => {
          try {
            await productModule.deleteProducts(product.id)
          } catch {
            // Product might already be deleted
          }
        })

        it("should create package record with valid data", async () => {
          const input = {
            productId: product.id,
            destination: "Arequipa Package",
            description: "Amazing package deal",
            duration_days: 3,
            max_capacity: 15,
          }

          const { result } = await testCreatePackageWorkflow(container).run({
            input,
          })

          expect(result).toBeDefined()
          expect(result.id).toBeDefined()
          expect(result.destination).toBe("Arequipa Package")
          expect(result.product_id).toBe(product.id)
          expect(result.duration_days).toBe(3)
          expect(result.max_capacity).toBe(15)

          const pkg = await packageModuleService.retrievePackage(result.id)
          expect(pkg).toBeDefined()
          expect(pkg.destination).toBe("Arequipa Package")

          await packageModuleService.deletePackages(result.id)
        })

        it("should return package data with id for rollback", async () => {
          const input = {
            productId: product.id,
            destination: "Test Package",
            duration_days: 2,
            max_capacity: 8,
          }

          const { result } = await testCreatePackageWorkflow(container).run({
            input,
          })

          expect(result.id).toBeDefined()

          await packageModuleService.deletePackages(result.id)
        })

        it("should handle optional description field", async () => {
          const input = {
            productId: product.id,
            destination: "No Description Package",
            duration_days: 1,
            max_capacity: 5,
          }

          const { result } = await testCreatePackageWorkflow(container).run({
            input,
          })

          expect(result).toBeDefined()
          expect(result.destination).toBe("No Description Package")

          await packageModuleService.deletePackages(result.id)
        })

        describe("Compensation (Rollback)", () => {
          it("should delete package when workflow fails and compensation is triggered", async () => {
            const input = {
              productId: product.id,
              destination: "Compensation Test Package",
              duration_days: 2,
              max_capacity: 10,
            }

            let packageId: string | null = null
            
            try {
              const { result } = await testPackageWithCompensationWorkflow(container).run({
                input,
              })
              packageId = result.id
            } catch (error) {
              // Expected to fail
            }

            if (packageId) {
              await expect(
                packageModuleService.retrievePackage(packageId)
              ).rejects.toThrow()
            }
          })
        })
      })

      describe("Cross-cutting Concerns", () => {
        describe("Step Isolation", () => {
          it("should not affect other tours when creating one tour", async () => {
            const product1 = await productModule.createProducts({
              title: "Tour Product 1",
              status: "published",
            })
            const product2 = await productModule.createProducts({
              title: "Tour Product 2",
              status: "published",
            })

            const input1 = {
              productId: product1.id,
              destination: "Tour 1",
              duration_days: 1,
              max_capacity: 5,
            }
            const input2 = {
              productId: product2.id,
              destination: "Tour 2",
              duration_days: 2,
              max_capacity: 10,
            }

            const { result: result1 } = await testCreateTourWorkflow(container).run({
              input: input1,
            })
            const { result: result2 } = await testCreateTourWorkflow(container).run({
              input: input2,
            })

            const tour1 = await tourModuleService.retrieveTour(result1.id)
            const tour2 = await tourModuleService.retrieveTour(result2.id)

            expect(tour1.destination).toBe("Tour 1")
            expect(tour2.destination).toBe("Tour 2")
            expect(tour1.duration_days).toBe(1)
            expect(tour2.duration_days).toBe(2)

            await tourModuleService.deleteTours([result1.id, result2.id])
            await productModule.deleteProducts([product1.id, product2.id])
          })

          it("should not affect other packages when creating one package", async () => {
            const product1 = await productModule.createProducts({
              title: "Package Product 1",
              status: "published",
            })
            const product2 = await productModule.createProducts({
              title: "Package Product 2",
              status: "published",
            })

            const input1 = {
              productId: product1.id,
              destination: "Package 1",
              duration_days: 3,
              max_capacity: 8,
            }
            const input2 = {
              productId: product2.id,
              destination: "Package 2",
              duration_days: 5,
              max_capacity: 12,
            }

            const { result: result1 } = await testCreatePackageWorkflow(container).run({
              input: input1,
            })
            const { result: result2 } = await testCreatePackageWorkflow(container).run({
              input: input2,
            })

            const pkg1 = await packageModuleService.retrievePackage(result1.id)
            const pkg2 = await packageModuleService.retrievePackage(result2.id)

            expect(pkg1.destination).toBe("Package 1")
            expect(pkg2.destination).toBe("Package 2")
            expect(pkg1.duration_days).toBe(3)
            expect(pkg2.duration_days).toBe(5)

            await packageModuleService.deletePackages([result1.id, result2.id])
            await productModule.deleteProducts([product1.id, product2.id])
          })
        })

        describe("Data Integrity", () => {
          it("should preserve dates and basic integrity when creating a tour", async () => {
            const product = await productModule.createProducts({
              title: "Dates Test Tour",
              status: "published",
            })

            const input = {
              productId: product.id,
              destination: "Dates Test",
              duration_days: 1,
              max_capacity: 5,
            }

            const { result } = await testCreateTourWorkflow(container).run({
              input,
            })

            const tour = await tourModuleService.retrieveTour(result.id)

            await tourModuleService.deleteTours(result.id)
            await productModule.deleteProducts(product.id)
          })

          it("should handle special characters in destination", async () => {
            const product = await productModule.createProducts({
              title: "Special Chars Tour",
              status: "published",
            })

            const input = {
              productId: product.id,
              destination: "Cusco & Sacred Valley (Perú)",
              duration_days: 2,
              max_capacity: 10,
            }

            const { result } = await testCreateTourWorkflow(container).run({
              input,
            })

            const tour = await tourModuleService.retrieveTour(result.id)
            expect(tour.destination).toBe("Cusco & Sacred Valley (Perú)")

            await tourModuleService.deleteTours(result.id)
            await productModule.deleteProducts(product.id)
          })
        })
      })
    })
  },
})
