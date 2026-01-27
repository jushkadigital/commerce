import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../modules/tour-booking"

export const createTourRecordStep = createStep(
  "create-tour-record",
  async (
    input: {
      productId: string
      destination: string
      description?: string
      duration_days: number
      max_capacity: number
      available_dates: string[]
    },
    { container }
  ) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    const tour = await tourModuleService.createTours({
      product_id: input.productId,
      destination: input.destination,
      description: input.description,
      duration_days: input.duration_days,
      max_capacity: input.max_capacity,
      available_dates: input.available_dates,
    })

    return new StepResponse(tour, tour.id)
  },
  // Compensation: Delete tour if workflow fails
  async (tourId: string | undefined, { container }) => {
    if (!tourId) return

    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)
    try {
      await tourModuleService.deleteTours(tourId)
      console.log(`[Compensation] Deleted tour ${tourId}`)
    } catch (error) {
      console.error(`[Compensation] Failed to delete tour ${tourId}:`, error)
    }
  }
)


