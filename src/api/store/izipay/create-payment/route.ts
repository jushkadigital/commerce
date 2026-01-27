import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
const IZIPAY_DOMAIN = "sandbox-api-pw.izipay.pe"

interface IzipayPaymentBody {
  merchantCode: string
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

    if (!transactionId || !body?.merchantCode || !body?.amount) {
      return res.status(400).json({
        error: "Missing required fields",
      })
    }

    const response = await fetch(`https://${IZIPAY_DOMAIN}/security/v1/Token/Generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "transactionId": transactionId,
      },
      body: JSON.stringify(body),
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
