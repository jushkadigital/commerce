import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PackageModuleService from "../../modules/package/service"
import { PACKAGE_MODULE } from "../../modules/package"

export type ValidatePackageStepInput = {
  destination: string
  available_dates: string[]
  duration_days: number
}

export const validatePackageStep = createStep(
  "validate-package-dates",
  async (input: ValidatePackageStepInput) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (input.duration_days < 1) {
      throw new Error("Duration must be at least 1 day.")
    }

    return new StepResponse({ valid: true })
  }
)
