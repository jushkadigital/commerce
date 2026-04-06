import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveIzipayConfig } from "../../../../utils/izipay-config"

interface IzipayPaymentBody {
  amount: number
  [key: string]: unknown
}

/**
 * POST /store/izipay/create-payment
 *
 * Proxy to Izipay Token API. All credentials come from client.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as IzipayPaymentBody
    const transactionId = req.headers["transactionid"] as string
    const { merchantCode, tokenEndpoint } = resolveIzipayConfig(process.env.NODE_ENV)

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

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "transactionId": transactionId,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    return res.status(response.status).json(data)

  } catch (error) {
    console.error("Izipay proxy error:", error)
    return res.status(500).json({
      error: "Failed to generate token",
    })
  }
}
