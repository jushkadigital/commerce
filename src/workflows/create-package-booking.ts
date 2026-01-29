import {
  createStep,
  createWorkflow,
  WorkflowResponse,
  StepResponse,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import { PACKAGE_MODULE } from "../modules/package"
import PackageModuleService from "../modules/package/service"
import { acquireLockStep, completeCartWorkflow, releaseLockStep, useQueryGraphStep, createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import packageBookingOrderLink from "../links/package-booking-order"
import { CreatePackageBookingsStepInput, createPackageBookingsStep } from "./steps/create-package-booking-create"
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
    const order = completeCartWorkflow.runAsStep({
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
      entity: packageBookingOrderLink.entryPoint,
      fields: ["package_booking.id"],
      filters: { order_id: order.id },
    }).config({ name: "retrieve-existing-links" })

    when({ existingLinks }, (data) => data.existingLinks.length === 0)
      .then(() => {
        const packageBookings = createPackageBookingsStep({
          order_id: order.id,
          cart: carts[0],
        } as unknown as CreatePackageBookingsStepInput)


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
      key: input.cart_id,
    })

    return new WorkflowResponse({
      order: refetchedOrder[0],
    })

  }
)

export default completeCartWithPackagesWorkflow
