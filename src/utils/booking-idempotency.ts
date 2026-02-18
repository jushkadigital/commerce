import type { MedusaContainer, InferTypeOf } from "@medusajs/framework/types"
import type TourModuleService from "../modules/tour/service"
import type { TourBooking } from "../modules/tour/models/tour-booking"
import { TOUR_MODULE } from "../modules/tour"

/**
 * Idempotency guard for tour booking creation.
 * Queries existing bookings by order_id to prevent duplicates
 * when the order.placed subscriber retries.
 */
export async function findExistingBooking(
  orderId: string,
  container: MedusaContainer
): Promise<InferTypeOf<typeof TourBooking>[]> {
  const tourModuleService = container.resolve(
    TOUR_MODULE
  ) as TourModuleService

  const existingBookings = await tourModuleService.listTourBookings({
    order_id: orderId,
  })

  return existingBookings
}
