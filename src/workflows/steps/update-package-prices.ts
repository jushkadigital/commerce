import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PACKAGE_MODULE } from "../../modules/package"
import PackageModuleService from "../../modules/package/service"

export type UpdatePackagePricesStepInput = {
  packageId: string
  prices: {
    adult?: number
    child?: number
    infant?: number
    currency_code?: string
  }
}

export const updatePackagePricesStep = createStep(
  "update-package-prices-step",
  async (input: UpdatePackagePricesStepInput, { container }) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    await packageModuleService.updateVariantPrices(
      input.packageId,
      input.prices,
      container
    )

    return new StepResponse({ success: true })
  }
)
