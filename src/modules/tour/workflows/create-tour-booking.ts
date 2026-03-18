import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import { TOUR_MODULE } from ".."
import { acquireLockStep, releaseLockStep, useQueryGraphStep, createRemoteLinkStep, completeCartWorkflow } from "@medusajs/medusa/core-flows"
import tourBookingOrderLink from "../../../links/tour-booking-order"
import { CreateBookingsStepInput, createTourBookingsStep } from "../../../workflows/steps/create-booking-create"
import { Modules } from "@medusajs/framework/utils"
import { generateTourLockKey } from "../../../utils/locking"
import { validateTourBookingStep } from "../../../workflows/steps/validate-tour-booking"

export type CompleteCartWithToursWorkflowInput = {
  cart_id: string
}


export const completeCartWithToursWorkflow = createWorkflow(
  "complete-cart-with-tours",
  (input: CompleteCartWithToursWorkflowInput) => {
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
            is_tour?: boolean
            tour_id?: string
            tour_date?: string
          } | null

          if (metadata?.is_tour && metadata.tour_id && metadata.tour_date) {
            keys.add(generateTourLockKey(metadata.tour_id, metadata.tour_date))
          }
        }
      }

      return Array.from(keys)
    })

    acquireLockStep({
      key: lockKeys,
      timeout: 30,
      ttl: 120,
    }).config({ name: "acquire-tour-locks" })

    validateTourBookingStep({
      cart_id: input.cart_id
    }).config({ name: "validate-tour-bookings" })

    const { id: orderId } = completeCartWorkflow.runAsStep({
      input: {
        id: input.cart_id,
      },
    })

    const { data: cartsWithTours } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "items.variant.*",
        "items.variant.options.*",
        "items.variant.options.option.*",
        "items.variant.tour_variant.*",
        "items.variant.tour_variant.tour.*",
        "items.metadata",
        "items.quantity",
      ],
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-cart-with-tours" })

    const { data: existingLinks } = useQueryGraphStep({
      entity: "tour_booking_order",
      fields: ["tour_booking.id"],
      filters: { order_id: orderId },
    }).config({ name: "retrieve-existing-links" })

    when({ existingLinks }, (data) => data.existingLinks.length === 0)
      .then(() => {
        const tourBookings = createTourBookingsStep({
          order_id: orderId,
          cart: cartsWithTours[0],
        } as unknown as CreateBookingsStepInput)
          .config({ name: "create-tour-bookings" })

        const linkData = transform({
          orderId,
          tourBookings,
        }, (data) => {
          return data.tourBookings.map((purchase) => ({
            [TOUR_MODULE]: {
              tour_booking_id: purchase.id,
            },
            [Modules.ORDER]: {
              order_id: data.orderId,
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
        id: orderId,
      },
    }).config({ name: "refetch-order" })

    releaseLockStep({
      key: lockKeys,
    }).config({ name: "release-tour-locks" })

    return new WorkflowResponse({
      order: refetchedOrder[0],
    })

  }
)

export default completeCartWithToursWorkflow
