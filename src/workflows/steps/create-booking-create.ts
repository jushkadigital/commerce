import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CartDTO, CartLineItemDTO, InferTypeOf, ProductVariantDTO } from "@medusajs/framework/types"
import TourModuleService from "../../modules/tour/service"
import { TOUR_MODULE, TourVariant } from "../../modules/tour"
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
      line_items: Record<string, unknown>
      metadata?: Record<string, unknown>
      tour_date: Date
    }[] = []

    const items = Object.entries(groupBy(cart.items, "metadata.group_id")).map(([type, items]) => ({
      type,
      items,
    }))

    logger.info(`${JSON.stringify(items)}`)

    for (const item of items as { type: string; items: any[] }[]) {
      const firstItem = item.items[0]
      const variantId = firstItem?.variant?.id
      const metadata = firstItem?.metadata as { tour_id?: string; tour_date?: string }
      const groupId =
        typeof firstItem?.metadata?.group_id === "string"
          ? firstItem.metadata.group_id
          : undefined
      
      // Try to get tour_id from metadata first, then from tour_variant link
      let tourId = metadata?.tour_id
      
      if (!tourId && variantId) {
        // Look up tour_variant by variant_id
        const tourVariants = await tourModuleService.listTourVariants({
          variant_id: variantId,
        })
        if (tourVariants.length > 0) {
          tourId = tourVariants[0].tour_id
        }
      }
      
      if (!tourId) {
        continue
      }
      
      const tourDate = metadata?.tour_date
      if (!tourDate) {
        continue
      }
      
      tourBookingsToCreate.push({
        order_id,
        tour_id: tourId,
        line_items: { items: item.items.map(ele => ({ variant_id: ele.variant_id, metadata: ele.metadata })) },
        metadata: groupId ? { group_id: groupId } : undefined,
        tour_date: new Date(tourDate),
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
