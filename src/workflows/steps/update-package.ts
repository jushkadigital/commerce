import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PACKAGE_MODULE } from "../../modules/package"
import PackageModuleService from "../../modules/package/service"

export type UpdatePackageStepInput = {
  id: string
  data: {
    destination?: string
    description?: string
    duration_days?: number
    max_capacity?: number
    available_dates?: string[]
    thumbnail?: string
  }
}

export const updatePackageStep = createStep(
  "update-package-step",
  async (input: UpdatePackageStepInput, { container }) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    const previousPackage = await packageModuleService.retrievePackage(input.id)

    const updatedPackages = await packageModuleService.updatePackages({
      id: input.id,
      ...input.data
    })

    return new StepResponse(updatedPackages, previousPackage)
  },
  async (previousPackage, { container }) => {
    if (!previousPackage) return
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)
    await packageModuleService.updatePackages({
      id: previousPackage.id,
      destination: previousPackage.destination,
      description: previousPackage.description,
      duration_days: previousPackage.duration_days,
      max_capacity: previousPackage.max_capacity,
      available_dates: previousPackage.available_dates,
    })
  }
)
