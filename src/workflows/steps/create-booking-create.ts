import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CartDTO, CartLineItemDTO, InferTypeOf, ProductVariantDTO } from "@medusajs/framework/types"
import TourModuleService from "../../modules/tour-booking/service"
import { TOUR_MODULE, TourVariant } from "../../modules/tour-booking"
import { groupBy } from "lodash"

export type CreateBookingsStepInput = {
  order_id: string
  cart: CartDTO & {
    items: CartLineItemDTO & {
      variant?: ProductVariantDTO & {
        tour_variant?: InferTypeOf<typeof TourVariant>
      }
    }[]
  }
}

export const createTourBookingsStep = createStep(
  "create-tour-bookings",
  async (input: CreateBookingsStepInput, { container }) => {
    const { order_id, cart } = input
    const tourModuleService = container.resolve(TOUR_MODULE)
    const logger = container.resolve("logger")

    // 2. Usar el logger de Medusa

    const tourBookingsToCreate: {
      order_id: string
      tour_id: string
      tour_variant_id: string
      tour_date: Date
    }[] = []

    const items = Object.entries(groupBy(cart.items, "metadata.group_id")).map(([type, items]) => ({
      type,
      items,
    }))

    logger.info(`${JSON.stringify(items)}`)
    // Process each item in the cart
    /**for (const item of cart.items) {
      if (
        !item?.variant?.tour_variant ||
        !item?.metadata?.tour_date
      ) { continue }

      tourBookingsToCreate.push({
        order_id,
        tour_id: item.variant.tour_variant.tour_id,
        tour_variant_id: item.variant.tour_variant.id,
        tour_date: new Date(
          item?.metadata.tour_date as string
        ),

      })
    }
    **/
    for (const item of items) {
      tourBookingsToCreate.push({
        order_id,
        tour_id: item.items[0].variant.tour_variant.tour_id,
        line_items: item.items.map(ele => ele.variant.tour_variant),
        tour_date: new Date(
          item.items[0]?.metadata.tour_date as string
        ),
      })

    }

    const tourBookings = await tourModuleService.createTourBookings(
      tourBookingsToCreate
    )

    return new StepResponse(
      tourBookings,
      tourBookings
    )
  },
  async (tourBookings, { container }) => {
    if (!tourBookings) { return }

    const tourModuleService = container.resolve(TOUR_MODULE)

    // Delete the created ticket purchases
    await tourModuleService.deleteTourBookings(
      tourBookings.map((tourBooking) => tourBooking.id)
    )
  }
)
