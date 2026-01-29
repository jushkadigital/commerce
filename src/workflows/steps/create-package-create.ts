import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PackageModuleService from "../../modules/package/service"
import { PACKAGE_MODULE } from "../../modules/package"

export type CreatePackagesStepInput = {
  packages: {
    product_id: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
    available_dates: string[]
  }[]
}

export const createPackagesStep = createStep(
  "create-packages",
  async (input: CreatePackagesStepInput, { container }) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    const packages = await packageModuleService.createPackages(input.packages)

    return new StepResponse(
      { packages },
      { packages }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.packages) { return }

    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    await packageModuleService.deletePackages(
      compensationData.packages.map((t) => t.id)
    )
  }
)
