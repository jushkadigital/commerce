import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TOUR_MODULE } from "../../modules/tour"
import TourModuleService from "../../modules/tour/service"

export type UpdateTourStepInput = {
  id: string
  data: {
    slug?: string
    destination?: string
    description?: string
    duration_days?: number
    max_capacity?: number
    thumbnail?: string
    is_special?: boolean
    booking_min_days_ahead?: number
    blocked_dates?: string[]
    blocked_week_days?: string[]
    cancellation_deadline_hours?: number
  }
}

export const updateTourStep = createStep(
  "update-tour-step",
  async (input: UpdateTourStepInput, { container }) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // 1. Get previous data for compensation
    const previousTour = await tourModuleService.retrieveTour(input.id)

    // 2. Update the record (updateTours expects an array)
    const [updatedTour] = await tourModuleService.updateTours([{
      id: input.id,
      ...input.data
    }])

    return new StepResponse(updatedTour, previousTour)
  },
  async (previousTour, { container }) => {
    if (!previousTour) return
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)
    // Revert changes (pass array for consistency)
    await tourModuleService.updateTours([{
      id: previousTour.id,
      destination: previousTour.destination,
      description: previousTour.description,
      duration_days: previousTour.duration_days,
      max_capacity: previousTour.max_capacity,
      is_special: previousTour.is_special,
      booking_min_days_ahead: previousTour.booking_min_days_ahead,
      blocked_dates: previousTour.blocked_dates,
      blocked_week_days: previousTour.blocked_week_days,
      cancellation_deadline_hours: previousTour.cancellation_deadline_hours,
    }])
  }
)
