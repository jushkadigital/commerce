import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { deleteLineItemsWorkflowId } from "@medusajs/core-flows"
import { refetchAddToCartResult } from "../refetch-cart"

const throwInvalidData = (message: string, code?: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message, code)
}

/**
 * Delete multiple line items from cart
 * POST /store/cart/delete-items
 *
 * Used for tour/package items that represent multiple variants.
 * Deleting one "booking" removes all associated line items at once.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as {
      cart_id?: string
      items?: string[]
    }

    const cart_id = body.cart_id
    const items = body.items

    if (!cart_id) {
      throwInvalidData("Missing required field: cart_id")
    }

    if (!Array.isArray(items) || items.length === 0) {
      throwInvalidData("Missing required field: items (array of line item IDs)")
    }

    const ensuredCartId = cart_id as string
    const itemsToDelete = items as string[]

    const cartModule = req.scope.resolve(Modules.CART)
    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)

    // Verify cart exists and retrieve current items to ensure ownership
    const cart = await cartModule.retrieveCart(ensuredCartId, {
      relations: ["items"],
    })

    // Filter items to delete that actually belong to this cart
    const validItemIdsToDelete = itemsToDelete.filter((id) =>
      cart.items?.some((item) => item.id === id)
    )

    if (validItemIdsToDelete.length === 0) {
      throwInvalidData("No valid line items found in cart to delete")
    }

    // Execute the native workflow — it handles:
    // 1. Cart locking
    // 2. Soft delete of line items
    // 3. refreshCartItemsWorkflow (prices, promotions, taxes, shipping, payment)
    // 4. cart.updated event emission
    await workflowEngine.run(deleteLineItemsWorkflowId, {
      input: {
        cart_id: ensuredCartId,
        ids: validItemIdsToDelete,
      },
    })

    // Retrieve updated cart with consistent field set
    const updatedCart = await refetchAddToCartResult(ensuredCartId, req.scope)

    res.json({
      cart: updatedCart,
      deleted_items: validItemIdsToDelete,
    })
  } catch (error) {
    console.error("Error deleting line items from cart:", error)

    if (MedusaError.isMedusaError(error)) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to delete line items from cart"
    )
  }
}
