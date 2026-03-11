import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { handleIzipayWebhookWorkflow } from "../../../../workflows/handle-izipay-ipn"

export async function POST(req: MedusaRequest & { rawBody?: string }, res: MedusaResponse) {
  const signature = 
    (req.headers['kr-hash'] as string) || 
    (req.headers['x-signature'] as string) ||
    (req.headers['signature'] as string) || 
    (req.body?.['kr-hash'] as string) ||
    (req.body?.['signature'] as string)

  if (!signature) {
    return res.status(400).json({ message: "Missing signature" })
  }

  // Use the raw body if captured by middleware, otherwise fallback to stringified parsed body
  // The raw body is critical for HMAC validation so spacing/newlines match exactly
  const payloadToHash = req.rawBody || JSON.stringify(req.body)

  const { errors } = await handleIzipayWebhookWorkflow(req.scope)
    .run({
      input: {
        payload: req.body,          // Parsed object for business logic
        rawPayload: payloadToHash,  // Raw string for signature validation
        signature,
        headers: req.headers as Record<string, any>
      },
      throwOnError: false
    })

  if (errors && errors.length > 0) {
    console.error("Izipay webhook error:", errors)
    const invalidSig = errors.some(e => e.error?.message === "Invalid signature")
    if (invalidSig) {
        return res.status(401).json({ message: "Invalid signature" })
    }
    return res.status(500).json({ message: "Internal server error" })
  }

  return res.status(200).json({ status: "success" })
}
