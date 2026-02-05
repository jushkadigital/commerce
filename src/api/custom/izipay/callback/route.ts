import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /custom/izipay/callback
 *
 * Receives payment result from Izipay SDK.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body
  console.log("Izipay callback received:", body)

  return res.json({
    status: "success",
    message: "Payment callback processed",
  })
}
