import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import addBookingToCartWorkflow from "../../../../workflows/add-booking-to-cart"
import { trackCommerceEvent, type TrackingItem } from "../../../../utils/conversion-tracking"

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
  pricingContext?: any
}

const throwInvalidData = (message: string, code?: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message, code)
}

/**
 * Add tour items to cart
 * POST /store/cart/tour-items
 *
 * Thin wrapper around addBookingToCartWorkflow
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const requestWithAuth = req as RequestWithAuthContext
    const body = req.body as {
      cart_id?: string
      tour_id?: string
      tour_date?: string
      adults?: number
      children?: number
      infants?: number
      customer?: {
        name: string
        email?: string
        phone?: string
        formId?: any
      }
      items?: Array<{
        variant_id: string
        quantity?: number
        unit_price?: number
        thumbnail?: string
        metadata?: Record<string, unknown>
      }>
    }

    // Validate cart_id
    if (!body.cart_id) {
      throwInvalidData("Missing required field: cart_id")
    }

    // Call the workflow with matching field names
    const { result } = await addBookingToCartWorkflow(req.scope).run({
      input: {
        cart_id: body.cart_id,
        type: "tour",
        id: body.tour_id,
        date: body.tour_date,
        adults: Number(body.adults || 0),
        children: Number(body.children || 0),
        infants: Number(body.infants || 0),
        customer: body.customer,
        items: body.items,
        pricing_context: (req as any).pricingContext,
        actor_id: (req as any).auth_context?.actor_id,
        additional_data: {},
      },
    })

    // The workflow's conditionalCartFetchStep returns cart with items.* (all item
    // fields) via baseFields. No refetch needed — just default promotions to []
    // (baseFields omits promotions when cart has none, per the optimization).
    const cart = { ...result.cart, promotions: result.cart?.promotions ?? [] }

    // Respond with cart and summary
    res.json({
      cart,
      summary: result.summary,
    })

    trackCommerceEvent({
      eventName: "AddToCart",
      eventId: `add_to_cart:${result.group_id}`,
      trigger: "store.cart.tour-items.post",
      request: req,
      currency: result.currency_code,
      value: result.total_price,
      items: result.tracking_items,
      description: result.summary.destination,
      user: {
        email: body.customer?.email,
        phone: body.customer?.phone,
        externalId: requestWithAuth.auth_context?.actor_id,
      },
    }).catch((err) => {
      console.error("[tracking] AddToCart event failed (non-blocking)", err)
    })
  } catch (error) {
    console.error("Error adding tour items to cart:", error)

    if (MedusaError.isMedusaError(error)) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to add tour items to cart"
    )
  }
}