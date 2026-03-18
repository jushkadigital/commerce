import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PACKAGE_MODULE } from "../../modules/package"
import PackageModuleService from "../../modules/package/service"

export type UpdatePackageStepInput = {
  id: string
  data: {
    slug?: string
    destination?: string
    description?: string
    duration_days?: number
    max_capacity?: number
    thumbnail?: string
    is_special?: boolean
    booking_min_months_ahead?: number
    blocked_dates?: string[]
    blocked_week_days?: string[]
    cancellation_deadline_hours?: number
  }
}

export const updatePackageStep = createStep(
  "update-package-step",
  async (input: UpdatePackageStepInput, { container }) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    const previousPackage = await packageModuleService.retrievePackage(input.id)

    // 2. Update the record (updatePackages expects an array)
    const [updatedPackage] = await packageModuleService.updatePackages([{
      id: input.id,
      ...input.data
    }])

    return new StepResponse(updatedPackage, previousPackage)
  },
  async (previousPackage, { container }) => {
    if (!previousPackage) return
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)
    // Revert changes (pass array for consistency)
    await packageModuleService.updatePackages([{ 
      id: previousPackage.id,
      destination: previousPackage.destination,
      description: previousPackage.description,
      duration_days: previousPackage.duration_days,
      max_capacity: previousPackage.max_capacity,
      is_special: previousPackage.is_special,
      booking_min_months_ahead: previousPackage.booking_min_months_ahead,
      blocked_dates: previousPackage.blocked_dates,
      blocked_week_days: previousPackage.blocked_week_days,
      cancellation_deadline_hours: previousPackage.cancellation_deadline_hours,
    }])
  }
)
