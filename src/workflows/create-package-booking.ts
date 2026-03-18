import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import { PACKAGE_MODULE } from "../modules/package"
import { acquireLockStep, releaseLockStep, useQueryGraphStep, createRemoteLinkStep, completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { CreatePackageBookingsStepInput, createPackageBookingsStep } from "./steps/create-package-booking-create"
import { validatePackageBookingStep } from "./steps/validate-package-booking"
import { Modules } from "@medusajs/framework/utils"

export type CompleteCartWithPackagesWorkflowInput = {
  cart_id: string
}

export const completeCartWithPackagesWorkflow = createWorkflow(
  "complete-cart-with-packages",
  (input: CompleteCartWithPackagesWorkflowInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    validatePackageBookingStep({
      cart_id: input.cart_id
    }).config({ name: "validate-package-bookings" })

    const { id: orderId } = completeCartWorkflow.runAsStep({
      input: {
        id: input.cart_id,
      },
    })
    const { data: carts } = useQueryGraphStep({
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
    })
    const { data: existingLinks } = useQueryGraphStep({
      entity: "package_booking_order",
      fields: ["package_booking.id"],
      filters: { order_id: orderId },
    }).config({ name: "retrieve-existing-links" })

    const { data: existingBookings } = useQueryGraphStep({
      entity: "package_booking",
      fields: ["id"],
      filters: { order_id: orderId },
    }).config({ name: "retrieve-existing-bookings" })

    const unlinkedExistingBookingIds = transform(
      { existingBookings, existingLinks },
      (data) => {
        const linkedBookingIds = new Set(
          data.existingLinks
            .map((link) => link.package_booking?.id)
            .filter((id): id is string => Boolean(id))
        )

        return data.existingBookings
          .map((booking) => booking.id)
          .filter((id): id is string => Boolean(id) && !linkedBookingIds.has(id))
      }
    )

    when({ existingBookings }, (data) => data.existingBookings.length === 0)
      .then(() => {
        const packageBookings = createPackageBookingsStep({
          order_id: orderId,
          cart: carts[0],
        } as unknown as CreatePackageBookingsStepInput)


        const linkData = transform({
          orderId,
          packageBookings,
        }, (data) => {
          return data.packageBookings.map((purchase) => ({
            [PACKAGE_MODULE]: {
              package_booking_id: purchase.id,
            },
            [Modules.ORDER]: {
              order_id: data.orderId,
            },
          }))
        })

        createRemoteLinkStep(linkData)
      })

    when(
      { existingBookings, unlinkedExistingBookingIds },
      (data) =>
        data.existingBookings.length > 0 &&
        data.unlinkedExistingBookingIds.length > 0
    ).then(() => {
      const existingLinkData = transform(
        { orderId, unlinkedExistingBookingIds },
        (data) => {
          return data.unlinkedExistingBookingIds.map((bookingId) => ({
            [PACKAGE_MODULE]: {
              package_booking_id: bookingId,
            },
            [Modules.ORDER]: {
              order_id: data.orderId,
            },
          }))
        }
      )

      createRemoteLinkStep(existingLinkData).config({
        name: "create-existing-order-links",
      })
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
        id: orderId,
      },
    }).config({ name: "refetch-order" })


    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse({
      order: refetchedOrder[0],
    })

  }
)

export default completeCartWithPackagesWorkflow
