import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour/service"
import PackageModuleService from "../../modules/package/service"
import { TOUR_MODULE } from "../../modules/tour"
import { PACKAGE_MODULE } from "../../modules/package"
import { MedusaError } from "@medusajs/framework/utils"

export type ValidateBlockedDatesStepInput = {
  entity_id: string
  entity_type: "tour" | "package"
  booking_date: Date
}

export const validateBlockedDatesStep = createStep(
  "validate-blocked-dates",
  async (input: ValidateBlockedDatesStepInput, { container }) => {
    const { entity_id, entity_type, booking_date } = input

    let blocked_dates: string[] = []
    let blocked_week_days: number[] = []

    if (entity_type === "tour") {
      const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)
      const tour = await tourModuleService.retrieveTour(entity_id)
      blocked_dates = (tour.blocked_dates || []) as string[]
      blocked_week_days = (tour.blocked_week_days || []) as unknown as number[]
    } else if (entity_type === "package") {
      const packageModuleService: PackageModuleService = container.resolve(PACKAGE_MODULE)
      const pkg = await packageModuleService.retrievePackage(entity_id)
      blocked_dates = (pkg.blocked_dates || []) as string[]
      blocked_week_days = (pkg.blocked_week_days || []) as unknown as number[]
    }

    const bookingDateStr = booking_date.toISOString().split("T")[0]

    if (blocked_dates.includes(bookingDateStr)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Booking date ${bookingDateStr} is blocked for this ${entity_type}`
      )
    }

    const weekDay = booking_date.getDay()
    if (blocked_week_days.includes(weekDay)) {
      const weekDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Bookings are not allowed on ${weekDayNames[weekDay]} for this ${entity_type}`
      )
    }

    return new StepResponse({ valid: true })
  }
)
