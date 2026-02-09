import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import TourModuleService from "../../modules/tour/service"
import PackageModuleService from "../../modules/package/service"
import { TOUR_MODULE } from "../../modules/tour"
import { PACKAGE_MODULE } from "../../modules/package"

export type ValidateBookingWindowStepInput = {
  entity_id: string
  entity_type: "tour" | "package"
  booking_date: Date
  current_date?: Date
}

export const validateBookingWindowStep = createStep(
  "validate-booking-window",
  async (input: ValidateBookingWindowStepInput, { container }) => {
    const { entity_id, entity_type, booking_date } = input
    const current_date = input.current_date || new Date()

    const normalizedBookingDate = new Date(booking_date)
    normalizedBookingDate.setHours(0, 0, 0, 0)

    const normalizedCurrentDate = new Date(current_date)
    normalizedCurrentDate.setHours(0, 0, 0, 0)

    let minRequiredValue: number
    let minRequiredUnit: "days" | "months"
    let entityName: string

    if (entity_type === "tour") {
      const tourService: TourModuleService = container.resolve(TOUR_MODULE)
      const tour = await tourService.retrieveTour(entity_id)

      minRequiredValue = tour.booking_min_days_ahead
      minRequiredUnit = "days"
      entityName = tour.destination || entity_id
    } else {
      const packageService: PackageModuleService = container.resolve(PACKAGE_MODULE)
      const packageEntity = await packageService.retrievePackage(entity_id)

      minRequiredValue = packageEntity.booking_min_months_ahead
      minRequiredUnit = "months"
      entityName = packageEntity.destination || entity_id
    }

    let isValid = false
    let actualDifference: number

    if (minRequiredUnit === "days") {
      const diffTime = normalizedBookingDate.getTime() - normalizedCurrentDate.getTime()
      actualDifference = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      isValid = actualDifference >= minRequiredValue
    } else {
      const bookingYear = normalizedBookingDate.getFullYear()
      const bookingMonth = normalizedBookingDate.getMonth()
      const currentYear = normalizedCurrentDate.getFullYear()
      const currentMonth = normalizedCurrentDate.getMonth()

      actualDifference = (bookingYear - currentYear) * 12 + (bookingMonth - currentMonth)

      const bookingDay = normalizedBookingDate.getDate()
      const currentDay = normalizedCurrentDate.getDate()

      if (actualDifference > 0 && bookingDay < currentDay) {
        actualDifference -= 1
      }

      isValid = actualDifference >= minRequiredValue
    }

    if (!isValid) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Booking for "${entityName}" must be made at least ${minRequiredValue} ${minRequiredUnit} in advance. ` +
          `Requested date is only ${actualDifference} ${minRequiredUnit} ahead.`
      )
    }

    return new StepResponse({
      valid: true,
      entity_type,
      entity_id,
      booking_date: normalizedBookingDate,
      current_date: normalizedCurrentDate,
      min_required: minRequiredValue,
      min_unit: minRequiredUnit,
      actual_difference: actualDifference,
    })
  }
)
