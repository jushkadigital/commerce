import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/izipay/error
 *
 * Receives payment errors from Izipay SDK.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body
  console.error("Izipay error received:", body)

  return res.json({
    status: "error",
    message: "Payment error processed",
  })
}
