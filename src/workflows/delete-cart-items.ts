import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"

/**
 * Workflow for deleting multiple line items from cart
 * Matches behavior of native deleteLineItem with batch support
 */

// Step 1: Delete line items with rollback support
const deleteLineItemsStep = createStep(
  "delete-line-items-step",
  async (
    input: { item_ids: string[] },
    { container }
  ) => {
    const cartModule: ICartModuleService = container.resolve(Modules.CART)

    // Soft delete the line items
    await cartModule.softDeleteLineItems(input.item_ids)

    return new StepResponse(
      { deleted_ids: input.item_ids },
      { deleted_ids: input.item_ids } // Compensation data
    )
  },
  async (compensationData, { container }) => {
    // Rollback: restore deleted items
    if (!compensationData?.deleted_ids?.length) return

    const cartModule: ICartModuleService = container.resolve(Modules.CART)
    await cartModule.restoreLineItems(compensationData.deleted_ids)
  }
)

// Step 2: Emit cart.updated event for frontend cache invalidation
const emitCartUpdatedEventStep = createStep(
  "emit-cart-updated-event-step",
  async (
    input: { cart_id: string },
    { container }
  ) => {
    const eventBus = container.resolve("event_bus")

    await eventBus.emit({
      name: "cart.updated",
      data: { id: input.cart_id },
    })

    return new StepResponse({ emitted: true })
  }
)

type DeleteCartItemsInput = {
  cart_id: string
  item_ids: string[]
}


export const deleteCartItemsWorkflow = createWorkflow(
  "delete-cart-items-workflow",
  function (input: DeleteCartItemsInput) {
    // Delete items
    const deletionResult = deleteLineItemsStep({
      item_ids: input.item_ids,
    })

    // Emit event in parallel (cart refresh handled automatically by Medusa)
    emitCartUpdatedEventStep({
      cart_id: input.cart_id,
    })

    return new WorkflowResponse({
      deleted_ids: deletionResult.deleted_ids,
    })
  }
)
