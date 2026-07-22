import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteLineItemsSlimWorkflow } from "../../../../workflows/delete-line-items-slim"

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

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Verify cart exists and retrieve ONLY item IDs for ownership check.
    // retrieveCart with relations:["items"] fetched ~30 cart fields + ~20 item
    // fields (~600ms). We only need items.id to filter which IDs belong to this
    // cart — query.graph with ["id","items.id"] cuts that to a 2-field join.
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "items.id"],
      filters: { id: ensuredCartId },
    })

    const cart = carts[0]

    if (!cart) {
      throwInvalidData("Cart not found")
    }

    // Filter items to delete that actually belong to this cart
    const validItemIdsToDelete = itemsToDelete.filter((id) =>
      cart.items?.some((item: any) => item.id === id)
    )

    if (validItemIdsToDelete.length === 0) {
      throwInvalidData("No valid line items found in cart to delete")
    }

    // Execute the slim delete workflow — it handles:
    // 1. Cart locking
    // 2. Soft delete of line items
    // 3. ONE wide cart fetch reused across: shipping (if any), promotions (REPLACE), payment sync
    // 4. cart.updated event emission + lock release
    // (Tax/pricing recalc intentionally skipped, matching the native delete path.)
    const { result } = await deleteLineItemsSlimWorkflow(req.scope).run({
      input: {
        cart_id: ensuredCartId,
        ids: validItemIdsToDelete,
      },
    })

    const updatedCart = result.cart
    const safeCart = { ...updatedCart, promotions: updatedCart.promotions ?? [] }

    res.json({
      message: "Successfully deleted line items",
      cart: safeCart,
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
