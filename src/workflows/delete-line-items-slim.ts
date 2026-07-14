import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  CartWorkflowEvents,
  PromotionActions,
} from "@medusajs/framework/utils"
import {
  acquireLockStep,
  releaseLockStep,
  deleteLineItemsStep,
  refreshCartShippingMethodsWorkflow,
  updateCartPromotionsWorkflow,
  refreshPaymentCollectionForCartWorkflow,
  emitEventStep,
} from "@medusajs/core-flows"
import { conditionalCartFetchStep, invalidateCartCacheStep } from "./steps/conditional-cart-fetch"

// ---------------------------------------------------------------------------
// Timing mark step
// ---------------------------------------------------------------------------

const markStep = createStep(
  "mark-timing",
  async (input: { label: string }) => {
    return new StepResponse(Date.now())
  },
  async () => {}
)

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export const deleteLineItemsSlimWorkflowId = "delete-line-items-slim"

type DeleteLineItemsSlimWorkflowInput = {
  cart_id: string
  ids: string[]
  additional_data?: Record<string, unknown>
}

/**
 * Slim delete workflow optimized for deleting MULTIPLE line items (variants) in one action.
 *
 * OTEL timing: mark-timing steps appear in the Grafana trace between each sub-workflow.
 * Read the gap between consecutive marks to see how long each sub-workflow took.
 */
export const deleteLineItemsSlimWorkflow = createWorkflow(
  {
    name: deleteLineItemsSlimWorkflowId,
    idempotent: false,
  },
  function (input: DeleteLineItemsSlimWorkflowInput) {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    deleteLineItemsStep(input.ids)

    // Invalidate cart cache so GET /store/carts/:id returns fresh data
    invalidateCartCacheStep({ cart_id: input.cart_id })

    // Conditional cart fetch — two-phase: light pre-fetch + main fetch with only needed fields.
    const cart = conditionalCartFetchStep({ cart_id: input.cart_id })

    const t0 = markStep({ label: "after-cart-fetch" })

    // Only refresh shipping methods when the cart actually has them.
    when("slim-refresh-shipping", { cart }, ({ cart }) => {
      return !!cart.shipping_methods?.length
    }).then(() => {
      refreshCartShippingMethodsWorkflow.runAsStep({
        input: {
          cart,
          additional_data: input.additional_data,
        },
      })
    })

    const t1 = markStep({ label: "after-shipping" }).config({ name: "mark-after-shipping" })

    // Only run promo recompute when the cart has promotions linked.
    // computeActions fetches ALL active promotions with 10 heavy relations
    // (application_method, target_rules, buy_rules, rules, campaign, budget)
    // even when the cart has no promo codes — that query alone takes ~2s.
    // Skipping it when there are no promotions saves that entire cost.
    //
    // CAVEAT: if you have AUTOMATIC promotions that could newly qualify after
    // item removal, remove this when() guard. For tours/packages without
    // auto-promos this is safe.
    when("slim-refresh-promotions", { cart }, ({ cart }) => {
      return !!cart.promotions?.length
    }).then(() => {
      const promoCodes = transform({ cart }, ({ cart }) => {
        return (cart.promotions ?? []).map((p: any) => p?.code).filter(Boolean)
      })

      updateCartPromotionsWorkflow.runAsStep({
        input: {
          cart,
          promo_codes: promoCodes,
          action: PromotionActions.REPLACE,
          force_refresh_payment_collection: false,
        },
      })
    })

    const t2 = markStep({ label: "after-promotions" }).config({ name: "mark-after-promotions" })

    // Only sync payment collection when one exists on the cart.
    when("slim-refresh-payment", { cart }, ({ cart }) => {
      return !!cart.payment_collection
    }).then(() => {
      refreshPaymentCollectionForCartWorkflow.runAsStep({
        input: { cart },
      })
    })

    const t3 = markStep({ label: "after-payment-collection" }).config({ name: "mark-after-payment" })

    // Emit cart.updated and release the lock.
    emitEventStep({
      eventName: CartWorkflowEvents.UPDATED,
      data: { id: input.cart_id },
    })

    releaseLockStep({
      key: input.cart_id,
    })

    const t4 = markStep({ label: "after-release" }).config({ name: "mark-after-release" })

    const shippingDelta = transform({ t0, t1 }, ({ t0, t1 }) => t1 - t0)
    const promotionsDelta = transform({ t1, t2 }, ({ t1, t2 }) => t2 - t1)
    const paymentDelta = transform({ t2, t3 }, ({ t2, t3 }) => t3 - t2)
    const totalDelta = transform({ t0, t4 }, ({ t0, t4 }) => t4 - t0)

    return new WorkflowResponse({
      cart,
      id: input.cart_id,
      timing: {
        shipping_ms: shippingDelta,
        promotions_ms: promotionsDelta,
        payment_ms: paymentDelta,
        total_ms: totalDelta,
      },
    })
  }
)

export default deleteLineItemsSlimWorkflow
