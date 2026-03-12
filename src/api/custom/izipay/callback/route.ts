import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { handleIzipayWebhookWorkflow } from "../../../../workflows/handle-izipay-ipn"

export async function POST(req: MedusaRequest & { rawBody?: string }, res: MedusaResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>
  const code = body.code as string | undefined
  const shouldValidateSignature = code !== "021" && code !== "COMMUNICATION_ERROR"
  const response =
    typeof body.response === "object" && body.response !== null
      ? (body.response as Record<string, unknown>)
      : undefined

  const signature = 
    (typeof body["signature"] === "string" ? body["signature"] : undefined) ||
    (typeof body["kr-hash"] === "string" ? body["kr-hash"] : undefined) ||
    (req.headers['kr-hash'] as string) || 
    (req.headers['x-signature'] as string) ||
    (req.headers['signature'] as string)

  if (shouldValidateSignature && !signature) {
    return res.status(400).json({ message: "Missing signature" })
  }

  const payloadHttp =
    (typeof body["payloadHttp"] === "string" ? body["payloadHttp"] : undefined) ||
    (typeof response?.["payloadHttp"] === "string" ? response["payloadHttp"] : undefined) ||
    (typeof body["kr-answer"] === "string" ? body["kr-answer"] : undefined)

  if (shouldValidateSignature && !payloadHttp) {
    return res.status(400).json({ message: "Missing payloadHttp" })
  }

  const payloadToHash = payloadHttp || req.rawBody || JSON.stringify(body)

  const { errors } = await handleIzipayWebhookWorkflow(req.scope)
    .run({
      input: {
        payload: body,
        rawPayload: payloadToHash,
        signature: signature || "",
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
