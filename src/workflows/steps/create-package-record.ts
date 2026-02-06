import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PackageModuleService from "../../modules/package/service"
import { PACKAGE_MODULE } from "../../modules/package"

export const createPackageRecordStep = createStep(
  "create-package-record",
  async (
    input: {
      productId: string
      destination: string
      description?: string
      duration_days: number
      max_capacity: number
      available_dates: string[]
    },
    { container }
  ) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    const pkg = await packageModuleService.createPackages({
      product_id: input.productId,
      destination: input.destination,
      description: input.description,
      duration_days: input.duration_days,
      max_capacity: input.max_capacity,
      available_dates: input.available_dates,
    })

    return new StepResponse(pkg, pkg[0]?.id)
  },
  async (packageId: string | undefined, { container }) => {
    if (!packageId) return

    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)
    try {
      await packageModuleService.deletePackages(packageId)
      console.log(`[Compensation] Deleted package ${packageId}`)
    } catch (error) {
      console.error(`[Compensation] Failed to delete package ${packageId}:`, error)
    }
  }
)
