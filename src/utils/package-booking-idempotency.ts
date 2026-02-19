import type { MedusaContainer, InferTypeOf } from "@medusajs/framework/types"
import type PackageModuleService from "../modules/package/service"
import type { PackageBooking } from "../modules/package/models/package-booking"
import { PACKAGE_MODULE } from "../modules/package"

/**
 * Idempotency guard for package booking creation.
 * Queries existing bookings by order_id to prevent duplicates
 * when the order.placed subscriber retries.
 */
export async function findExistingPackageBooking(
  orderId: string,
  container: MedusaContainer
): Promise<InferTypeOf<typeof PackageBooking>[]> {
  const packageModuleService = container.resolve(
    PACKAGE_MODULE
  ) as PackageModuleService

  const existingBookings = await packageModuleService.listPackageBookings({
    order_id: orderId,
  })

  return existingBookings
}
