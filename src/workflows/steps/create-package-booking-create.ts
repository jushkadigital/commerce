import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CartDTO, CartLineItemDTO, InferTypeOf, ProductVariantDTO } from "@medusajs/framework/types"
import PackageModuleService from "../../modules/package/service"
import { PACKAGE_MODULE, PackageVariant } from "../../modules/package"
import { groupBy } from "lodash"

export type CreatePackageBookingsStepInput = {
  order_id: string
  cart: CartDTO & {
    items: CartLineItemDTO & {
      variant?: ProductVariantDTO & {
        package_variant?: InferTypeOf<typeof PackageVariant>
      }
    }[]
  }
}

export const createPackageBookingsStep = createStep(
  "create-package-bookings",
  async (input: CreatePackageBookingsStepInput, { container }) => {
    const { order_id, cart } = input
    const packageModuleService = container.resolve(PACKAGE_MODULE)
    const logger = container.resolve("logger")

    const packageBookingsToCreate: {
      order_id: string
      package_id: string
      line_items: any[]
      package_date: Date
    }[] = []

    const items = Object.entries(groupBy(cart.items, "metadata.group_id")).map(([type, items]) => ({
      type,
      items,
    }))

    logger.info(`${JSON.stringify(items)}`)

    for (const item of items) {
      packageBookingsToCreate.push({
        order_id,
        package_id: item.items[0].variant.package_variant.package_id,
        line_items: item.items.map(ele => ele.variant.package_variant),
        package_date: new Date(
          item.items[0]?.metadata.package_date as string
        ),
      })
    }

    const packageBookings = await packageModuleService.createPackageBookings(
      packageBookingsToCreate
    )

    return new StepResponse(
      packageBookings,
      packageBookings
    )
  },
  async (packageBookings, { container }) => {
    if (!packageBookings) { return }

    const packageModuleService = container.resolve(PACKAGE_MODULE)

    await packageModuleService.deletePackageBookings(
      packageBookings.map((packageBooking) => packageBooking.id)
    )
  }
)
