import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../modules/tour-booking"

export type CreateToursStepInput = {
  tours: {
    product_id: string
    destination: string
    description?: string
    duration_days: number
    max_capacity: number
    available_dates: string[]
  }[]
}



/**
 * Step 1: Create Medusa product with variants
 */
export const createToursStep = createStep(
  "create-tours",
  async (input: CreateToursStepInput, { container }) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // Creamos los tours (el servicio generado por Medusa suele aceptar arrays)
    const tours = await tourModuleService.createTours(input.tours)

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
