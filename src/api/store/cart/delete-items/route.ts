import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { deleteLineItemsWorkflowId } from "@medusajs/core-flows"

/**
 * Helper to refetch cart with all calculated fields via remote query
 */
const refetchCart = async (
  id: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id } },
    fields,
  })

  const [cart] = await remoteQuery(queryObject)

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id '${id}' not found`
    )
  }

  return cart
}

/**
 * Delete multiple line items from cart
 * POST /store/cart/delete-items
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as {
      cart_id?: string
      items?: string[]
    }

    const cart_id = body.cart_id
    const itemsToDelete = body.items

    if (!cart_id) {
      return res.status(400).json({
        message: "Missing required field: cart_id",
      })
    }

    if (!Array.isArray(itemsToDelete) || itemsToDelete.length === 0) {
      return res.status(400).json({
        message: "Missing required field: items (array of line item IDs)",
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)

    // Verify cart exists and retrieve current items to ensure ownership
    const cart = await cartModule.retrieveCart(cart_id, {
      relations: ["items"],
    })

    // Filter items to delete that actually belong to this cart
    const validItemIdsToDelete = itemsToDelete.filter((id) =>
      cart.items?.some((item) => item.id === id)
    )

    if (validItemIdsToDelete.length === 0) {
      return res.status(400).json({
        message: "No valid line items found in cart to delete",
      })
    }

    // Execute the workflow to delete items and refresh the cart (recalculating totals)
    await workflowEngine.run(deleteLineItemsWorkflowId, {
      input: {
        cart_id,
        ids: validItemIdsToDelete,
      },
    })

    // Retrieve updated cart with all calculated fields via remote query
    const updatedCart = await refetchCart(
      cart_id,
      req.scope,
      ["*", "items.*", "region.*", "shipping_address.*", "billing_address.*"]
    )

    res.json({
      cart: updatedCart,
      deleted_items: validItemIdsToDelete,
      message: "Successfully deleted line items",
    })
  } catch (error) {
    console.error("Error deleting line items from cart:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    res.status(500).json({
      message: "Failed to delete line items from cart",
      error: errorMessage,
    })
  }
}
