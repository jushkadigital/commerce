import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveIzipayConfig } from "../../../../utils/izipay-config"
import { trackCommerceEvent, type TrackingItem } from "../../../../utils/conversion-tracking"

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

interface IzipayPaymentBody {
  amount: number
  cart_id?: string
  currency?: string
  [key: string]: unknown
}

/**
 * POST /store/izipay/create-payment
 *
 * Proxy to Izipay Token API. All credentials come from client.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const requestWithAuth = req as RequestWithAuthContext
    const body = req.body as IzipayPaymentBody
    const transactionId = req.headers["transactionid"] as string
    const { merchantCode, tokenEndpoint } = resolveIzipayConfig(process.env.NODE_ENV)
    const logger = req.scope.resolve("logger")

    if (!transactionId || !body?.amount) {
      return res.status(400).json({
        error: "Missing required fields",
      })
    }

    if (!merchantCode || !tokenEndpoint) {
      return res.status(500).json({
        error: "Izipay server configuration is incomplete",
      })
    }

    const payload = {
      ...body,
      merchantCode,
    }

    let trackingItems: TrackingItem[] = []
    let cartEmail: string | undefined
    let cartCurrency = typeof body.currency === "string" ? body.currency : undefined

    if (typeof body.cart_id === "string" && body.cart_id.trim().length > 0) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: [
          "id",
          "email",
          "currency_code",
          "customer.id",
          "customer.email",
          "items.id",
          "items.title",
          "items.quantity",
          "items.unit_price",
          "items.variant_id",
          "items.metadata",
        ],
        filters: { id: body.cart_id },
      })

      const cart = carts[0] as {
        email?: string
        currency_code?: string
        customer?: { id?: string; email?: string }
        items?: Array<{
          title?: string
          quantity?: number
          unit_price?: number
          variant_id?: string
          metadata?: Record<string, unknown>
        }>
      } | undefined

      if (cart) {
        cartEmail = cart.email || cart.customer?.email
        cartCurrency = cart.currency_code || cartCurrency
        trackingItems = (cart.items || []).reduce<TrackingItem[]>((acc, item) => {
            const contentType = item.metadata?.is_tour === true
              ? "tour"
              : item.metadata?.is_package === true
                ? "package"
                : "product"
            const contentCategory = contentType
            const contentId = typeof item.variant_id === "string"
              ? item.variant_id
              : undefined

            if (!contentId) {
              return acc
            }

            acc.push({
              contentId,
              contentType,
              contentCategory,
              contentName: typeof item.title === "string" ? item.title : undefined,
              quantity: Number(item.quantity || 1),
              price: Number(item.unit_price || 0),
            })

            return acc
          }, [])
      }
    }

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "transactionId": transactionId,
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get("content-type") ?? ""
    const rawBody = await response.text()

    if (!contentType.toLowerCase().includes("application/json")) {
      console.error("Izipay proxy received non-JSON response", {
        status: response.status,
        contentType,
        url: response.url,
        bodyPreview: rawBody.slice(0, 500),
      })

      return res.status(response.status).json({
        error: "Izipay returned a non-JSON response",
        upstream_status: response.status,
        upstream_content_type: contentType || "unknown",
      })
    }

    const data = JSON.parse(rawBody)

    if (response.ok) {
      await trackCommerceEvent({
        eventName: "InitiateCheckout",
        eventId: `initiate_checkout:${transactionId}`,
        request: req,
        currency: cartCurrency,
        value: Number(body.amount),
        items: trackingItems,
        user: {
          email: cartEmail,
          externalId: requestWithAuth.auth_context?.actor_id,
        },
        logger,
      })
    }

    return res.status(response.status).json(data)

  } catch (error) {
    console.error("Izipay proxy error:", error)
    return res.status(500).json({
      error: "Failed to generate token",
    })
  }
}
