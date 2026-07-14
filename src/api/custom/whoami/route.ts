import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({
    sessionID: req.session,
    hasCustomer: !!req.session.customer_id,
    customer_id: req.session.customer_id || "VACÍO",
    // En Medusa v2 a veces se guarda como 'user_id' o en auth_context
    all_keys: Object.keys(req.session || {})
  })
}
