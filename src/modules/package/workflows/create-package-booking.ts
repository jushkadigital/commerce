import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import { PACKAGE_MODULE } from ".."
import { acquireLockStep, releaseLockStep, useQueryGraphStep, createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import packageBookingOrderLink from "../../../links/package-booking-order"
import { CreatePackageBookingsStepInput, createPackageBookingsStep } from "../../../workflows/steps/create-package-booking-create"
import { Modules } from "@medusajs/framework/utils"
import { generatePackageLockKey } from "../../../utils/locking"
import createOrderFromCartStep from "../../../workflows/steps/create-order-from-cart"
import { validatePackageBookingStep } from "../../../workflows/steps/validate-package-booking"

export type CompleteCartWithPackagesWorkflowInput = {
  cart_id: string
}


export const completeCartWithPackagesWorkflow = createWorkflow(
  "complete-cart-with-packages",
  (input: CompleteCartWithPackagesWorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "items.metadata",
        "items.quantity",
      ],
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-cart-items" })

    const lockKeys = transform({ carts }, ({ carts }) => {
      const keys = new Set<string>()
      const cart = carts[0]

      if (cart?.items) {
        for (const item of cart.items) {
          if (!item) continue
          const metadata = item.metadata as {
            is_package?: boolean
            package_id?: string
            package_date?: string
          } | null

          if (metadata?.is_package && metadata.package_id && metadata.package_date) {
            keys.add(generatePackageLockKey(metadata.package_id, metadata.package_date))
          }
        }
      }

      return Array.from(keys)
    })

    acquireLockStep({
      key: lockKeys,
      timeout: 30,
      ttl: 120,
    }).config({ name: "acquire-package-locks" })

    validatePackageBookingStep({
      cart_id: input.cart_id
    }).config({ name: "validate-package-bookings" })

    const order = createOrderFromCartStep({
      cart_id: input.cart_id,
    }).config({ name: "create-order-from-cart" })

    const { data: cartsWithPackages } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "items.variant.*",
        "items.variant.options.*",
        "items.variant.options.option.*",
        "items.variant.package_variant.*",
        "items.variant.package_variant.package.*",
        "items.metadata",
        "items.quantity",
      ],
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-cart-with-packages" })

    const { data: existingLinks } = useQueryGraphStep({
      entity: "package_booking_order",
      fields: ["package_booking.id"],
      filters: { order_id: order.id },
    }).config({ name: "retrieve-existing-links" })

    when({ existingLinks }, (data) => data.existingLinks.length === 0)
      .then(() => {
        const packageBookings = createPackageBookingsStep({
          order_id: order.id,
          cart: cartsWithPackages[0],
        } as unknown as CreatePackageBookingsStepInput)
          .config({ name: "create-package-bookings" })

        const linkData = transform({
          order,
          packageBookings,
        }, (data) => {
          return data.packageBookings.map((purchase) => ({
            [PACKAGE_MODULE]: {
              package_booking_id: purchase.id,
            },
            [Modules.ORDER]: {
              order_id: data.order.id,
            },
          }))
        })

        createRemoteLinkStep(linkData)
          .config({ name: "create-order-links" })
      })

    const { data: refetchedOrder } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "currency_code",
        "email",
        "customer.*",
        "billing_address.*",
        "payment_collections.*",
        "items.*",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "created_at",
        "updated_at",
      ],
      filters: {
        id: order.id,
      },
    }).config({ name: "refetch-order" })

    releaseLockStep({
      key: lockKeys,
    }).config({ name: "release-package-locks" })

    return new WorkflowResponse({
      // cast to any to avoid excessive type-depth issues from complex
      // generated workflow types. This file's runtime shape is verified in
      // tests; keep typing loose here to satisfy the typechecker.
      order: refetchedOrder[0] as any,
    })

  }
)

export default completeCartWithPackagesWorkflow
