import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeCartWithToursWorkflow } from "../../../../../workflows/create-tour-booking"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { result } = await completeCartWithToursWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
    },
  })

  res.json({
    type: "order",
    order: result.order,
  })
}
