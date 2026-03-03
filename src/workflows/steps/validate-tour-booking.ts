import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TourModuleService from "../../modules/tour/service"
import { TOUR_MODULE } from "../../modules/tour"

export type ValidateTourBookingStepInput = {
  cart_id: string
}

export const validateTourBookingStep = createStep(
  "validate-tour-booking",
  async (input: ValidateTourBookingStepInput, { container }) => {
    const tourService: TourModuleService = container.resolve(TOUR_MODULE)
    const query = container.resolve("query")
    const logger = container.resolve("logger")
    
    logger.info(`[VALIDATE] Starting validation for cart ${input.cart_id}`)
    
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "items.metadata", "items.quantity"],
      filters: { id: input.cart_id },
    })
    
    const cart = carts[0]
    
    if (!cart) {
      logger.error(`[VALIDATE] Cart ${input.cart_id} not found`)
      throw new Error(`Cart ${input.cart_id} not found`)
    }
    
    logger.info(`[VALIDATE] Cart found with ${cart.items?.length || 0} items`)
    
    const tourItems = (cart.items || []).filter(
      (item: any) => item && item.metadata?.is_tour === true
    )
    
    logger.info(`[VALIDATE] Found ${tourItems.length} tour items`)

    for (const item of tourItems) {
      if (!item) continue

      const metadata = item.metadata as {
        tour_id?: string
        tour_date?: string
        total_passengers?: number
      }
      
      const tourId = metadata?.tour_id
      const tourDateStr = metadata?.tour_date
      const totalPassengers = metadata?.total_passengers ?? 0
      
      logger.info(`[VALIDATE] Validating tour ${tourId} for date ${tourDateStr} with ${totalPassengers} passengers`)

      if (!tourId) {
        throw new Error("Tour ID is required for tour bookings")
      }

      if (!tourDateStr) {
        throw new Error("Tour date is required for tour bookings")
      }

      if (totalPassengers <= 0) {
        throw new Error("Total passengers must be greater than 0 for tour bookings")
      }

      const tourDate = new Date(tourDateStr)

      const validation = await tourService.validateBooking(
        tourId,
        tourDate,
        totalPassengers
      )
      
      logger.info(`[VALIDATE] Validation result: ${JSON.stringify(validation)}`)

      if (!validation.valid) {
        throw new Error(validation.reason || "Tour booking validation failed")
      }
    }

    return new StepResponse({ validated: true })
  }
)
