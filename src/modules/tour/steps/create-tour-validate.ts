import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../service"
import { TOUR_MODULE } from ".."

export type ValidateTourStepInput = {
  destination: string
  duration_days: number
}

export const validateTourStep = createStep(
  "validate-tour-dates",
  async (input: ValidateTourStepInput) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)



    console.log("ValidateTourStep Input:", JSON.stringify(input))

    if (input.duration_days < 1) {
      throw new Error("Duration must be at least 1 day.")
    }

    return new StepResponse({ valid: true })
  }
)
