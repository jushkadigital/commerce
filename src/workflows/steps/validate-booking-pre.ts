import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../modules/tour"
import { PACKAGE_MODULE } from "../../modules/package"
import TourModuleService from "../../modules/tour/service"
import PackageModuleService from "../../modules/package/service"

export type ValidateBookingPreStepInput = {
  type: "tour" | "package"
  entity_id: string
  entity_date: string
  total_passengers: number
}

/**
 * Validates a booking BEFORE items are added to the cart.
 * Checks: past dates, min days ahead, blocked dates, blocked weekdays, capacity.
 * Runs after prepareBookingStep and before createLineItemsStep.
 */
export const validateBookingPreStep = createStep(
  "validate-booking-pre",
  async (input: ValidateBookingPreStepInput, { container }) => {
    const date = new Date(input.entity_date)
    const passengers = input.total_passengers || 0

    if (input.type === "tour") {
      const tourService: TourModuleService = container.resolve(TOUR_MODULE)
      const validation = await tourService.validateBooking(
        input.entity_id,
        date,
        passengers,
      )
      if (!validation.valid) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          validation.reason || "Tour booking validation failed"
        )
      }
    } else {
      const packageService: PackageModuleService = container.resolve(PACKAGE_MODULE)
      const validation = await packageService.validateBooking(
        input.entity_id,
        date,
        passengers,
      )
      if (!validation.valid) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          validation.reason || "Package booking validation failed"
        )
      }
    }

    return new StepResponse({ validated: true })
  }
)
