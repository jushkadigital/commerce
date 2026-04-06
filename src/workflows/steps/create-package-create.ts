import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PackageModuleService from "../../modules/package/service"
import { PACKAGE_MODULE } from "../../modules/package"

export type CreatePackagesStepInput = {
  packages: {
    product_id: string
    slug: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
    thumbnail?: string
    is_special?: boolean
    blocked_dates?: string[]
    blocked_week_days?: string[]
    cancellation_deadline_hours?: number
    booking_min_days_ahead?: number,
    metadata?: Record<string, any>

  }[]
}

export const createPackagesStep = createStep(
  "create-packages",
  async (input: CreatePackagesStepInput, { container }) => {
    const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)

    // Transform packages data to match service expectations (blocked_week_days as strings)
    const packagesData = input.packages.map((pkg) => ({
      ...pkg,
      blocked_week_days: pkg.blocked_week_days?.map((day) => day.toString()),
    }))

    const packages = await packageModuleService.createPackages(packagesData)

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
