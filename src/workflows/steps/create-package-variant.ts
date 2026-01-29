import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PackageModuleService from "../../modules/package/service"
import { PassengerType, PACKAGE_MODULE } from "../../modules/package"

export type CreatePackageVariantsStepInput = {
  variants: {
    package_id: string
    variant_id: string
    passenger_type: PassengerType
  }[]
}

export const createPackageVariantsStep = createStep(
  "create-package-variants",
  async (input: CreatePackageVariantsStepInput, { container }) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    const packageVariants = await packageModuleService.createPackageVariants(input.variants)

    return new StepResponse(
      { package_variants: packageVariants },
      { package_variants: packageVariants }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.package_variants) { return }

    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    await packageModuleService.deletePackageVariants(
      compensationData.package_variants.map((v) => v.id)
    )
  }
)
