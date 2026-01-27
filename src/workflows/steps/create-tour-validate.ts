import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../modules/tour-booking"

export type ValidateTourStepInput = {
  destination: string
  available_dates: string[]
  duration_days: number
}

export const validateTourStep = createStep(
  "validate-tour-dates",
  async (input: ValidateTourStepInput) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)



    if (input.duration_days < 1) {
      throw new Error("Duration must be at least 1 day.")
    }

    return new StepResponse({ valid: true })
  }
)
