import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TOUR_MODULE } from "../..//modules/tour-booking"
import TourModuleService from "../../modules/tour-booking/service"

export type UpdateTourStepInput = {
  id: string
  data: {
    destination?: string
    description?: string
    duration_days?: number
    max_capacity?: number
    available_dates?: string[]
    thumbnail?: string
  }
}

export const updateTourStep = createStep(
  "update-tour-step",
  async (input: UpdateTourStepInput, { container }) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // 1. Get previous data for compensation
    const previousTour = await tourModuleService.retrieveTour(input.id)

    // 2. Update the record
    const updatedTours = await tourModuleService.updateTours({
      id: input.id,
      ...input.data
    })

    return new StepResponse(updatedTours, previousTour)
  },
  async (previousTour, { container }) => {
    if (!previousTour) return
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)
    // Revert changes
    await tourModuleService.updateTours({
      id: previousTour.id,
      destination: previousTour.destination,
      description: previousTour.description,
      duration_days: previousTour.duration_days,
      max_capacity: previousTour.max_capacity,
      available_dates: previousTour.available_dates,
    })
  }
)


