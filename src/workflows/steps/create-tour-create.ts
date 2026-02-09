import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour/service"
import { TOUR_MODULE } from "../../modules/tour"

export type CreateToursStepInput = {
  tours: {
    product_id: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
    thumbnail?: string
    is_special?: boolean
    blocked_dates?: string[]
    blocked_week_days?: number[]
    cancellation_deadline_hours?: number
    booking_min_days_ahead?: number
  }[]
}



/**
 * Step 1: Create Medusa product with variants
 */
export const createToursStep = createStep(
  "create-tours",
  async (input: CreateToursStepInput, { container }) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // Transform tours data to match service expectations (blocked_week_days as strings)
    const toursData = input.tours.map((tour) => ({
      ...tour,
      blocked_week_days: tour.blocked_week_days?.map((day) => day.toString()),
    }))

    // Creamos los tours (el servicio generado por Medusa suele aceptar arrays)
    const tours = await tourModuleService.createTours(toursData)

    return new StepResponse(
      { tours },
      { tours } // Datos para compensación
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.tours) { return }

    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // Eliminamos los tours creados si falla el workflow
    await tourModuleService.deleteTours(
      compensationData.tours.map((t) => t.id)
    )
  }
)
