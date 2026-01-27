import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TOUR_MODULE } from "../../modules/tour-booking"
import TourModuleService from "../../modules/tour-booking/service"

export type UpdateTourPricesStepInput = {
  tourId: string
  prices: {
    adult?: number
    child?: number
    infant?: number
    currency_code?: string
  }
}

export const updateTourPricesStep = createStep(
  "update-tour-prices-step",
  async (input: UpdateTourPricesStepInput, { container }) => {
    const tourModuleService: TourModuleService = container.resolve(TOUR_MODULE)

    // We use the method you defined in your service
    // Passing 'container' is crucial because your service uses it to resolve Modules.PRICING
    await tourModuleService.updateVariantPrices(
      input.tourId,
      input.prices,
      container
    )

    return new StepResponse({ success: true })
  }
)

