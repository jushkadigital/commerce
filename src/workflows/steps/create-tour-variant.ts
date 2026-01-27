import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour-booking/service"
import { PassengerType, TOUR_MODULE } from "../../modules/tour-booking"

export type CreateTourVariantsStepInput = {
  variants: {
    tour_id: string
    variant_id: string // ID del Product Variant de Medusa
    passenger_type: PassengerType
  }[]
}
export const createTourVariantsStep = createStep(
  "create-tour-variants",
  async (input: CreateTourVariantsStepInput, { container }) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // Creamos los variantes del tour
    const tourVariants = await tourModuleService.createTourVariants(input.variants)

    return new StepResponse(
      { tour_variants: tourVariants },
      { tour_variants: tourVariants }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.tour_variants) { return }

    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // Eliminamos los variantes si falla
    await tourModuleService.deleteTourVariants(
      compensationData.tour_variants.map((v) => v.id)
    )
  }
)


