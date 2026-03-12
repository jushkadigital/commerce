import { createWorkflow, WorkflowResponse, createStep, StepResponse, transform, when } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import crypto from "crypto"

function validateSignature(payload: string, signature: string, hashKey: string): boolean {
  if (!hashKey || !signature) return false
  
  try {
    const hmac = crypto.createHmac("sha256", Buffer.from(hashKey, "utf-8"))
    const messageBytes = Buffer.from(payload, "utf-8")
    const hash = hmac.update(messageBytes).digest("base64")
    const normalizedSignature = signature.trim()
    
    const sigBuffer = Buffer.from(normalizedSignature, "base64")
    const hashBuffer = Buffer.from(hash, "base64")
    
    if (sigBuffer.length !== hashBuffer.length) {
      return false
    }
    
    return crypto.timingSafeEqual(sigBuffer, hashBuffer)
  } catch (e) {
    console.error("Signature validation error", e)
    return false
  }
}

type IzipayWebhookInput = {
  payload: any
  rawPayload: string
  signature: string
  headers: Record<string, any>
}

export const validateIzipaySignatureStep = createStep(
  "validate-izipay-signature",
  async (input: IzipayWebhookInput, { container }) => {
    const { rawPayload, signature } = input
    const hashKey = process.env.IZIPAY_HASH_KEY || ""
    const code = input.payload?.code
    
    if (!hashKey) {
        throw new Error("IZIPAY_HASH_KEY not configured")
    }

    if (code === "021" || code === "COMMUNICATION_ERROR") {
      return new StepResponse({ isValid: true, skipped: true })
    }
    
    const isValid = validateSignature(rawPayload, signature, hashKey)
    
    if (!isValid) {
      throw new Error("Invalid signature")
    }
    
    return new StepResponse({ isValid: true })
  }
)

export const storeIzipayEventStep = createStep(
  "store-izipay-event",
  async (input: { payload: any, signature: string }, { container }) => {
    const izipayService = container.resolve("izipay") as any
    
    let transactionId = "unknown"
    let orderId = "unknown"
    
    try {
        const body = input.payload
        const answer = body['kr-answer'] || body
        
        if (body.transactionId) {
             transactionId = body.transactionId;
        } else if (answer.transactions && answer.transactions.length > 0) {
            transactionId = answer.transactions[0].uuid
        }
        
        if (body.response?.order?.[0]?.orderNumber) {
            orderId = body.response.order[0].orderNumber
        } else if (answer.orderDetails) {
            orderId = answer.orderDetails.orderId
        }
    } catch (e) {
        console.error("Error parsing Izipay payload:", e)
    }

    const existing = await izipayService.listIzipayIpnEvents({
        transaction_id: transactionId
    })
    
    if (existing.length > 0) {
        return new StepResponse({ isDuplicate: true, event: existing[0] })
    }
    
    const event = await izipayService.createIzipayIpnEvents({
        transaction_id: transactionId,
        order_id: orderId,
        payload: input.payload,
        is_valid: true,
        processed_at: new Date()
    })
    
    return new StepResponse({ isDuplicate: false, event })
  }
)

export const retrieveCartAndPaymentStep = createStep(
  "retrieve-cart-payment-izipay",
  async (orderId: string, { container }) => {
    if (!orderId || orderId === "unknown") {
        return new StepResponse(null)
    }

    const query = container.resolve("query")
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["*", "payment_collection.*", "payment_collection.payment_sessions.*"],
      filters: { id: orderId }
    })
    
    if (!carts.length) {
        return new StepResponse(null)
    }
    
    return new StepResponse(carts[0])
  }
)

export const validateAndAuthorizeStep = createStep(
  "validate-authorize-izipay",
  async (input: { cart: any, payload: any }, { container }) => {
    const { cart, payload } = input
    if (!cart) return new StepResponse({ success: false })

    const paymentModule = container.resolve(Modules.PAYMENT)
    
    const orderDetails = payload.response?.order?.[0] || {}
    const amountStr = orderDetails.amount 
    const stateMessage = orderDetails.stateMessage
    const codeAuth = orderDetails.codeAuth 
    
    const isAuthorized = stateMessage === "Autorizado" || !!codeAuth
    
    if (!isAuthorized) {
        return new StepResponse({ success: false, reason: "Not authorized by Izipay" })
    }
    
    if (amountStr) {
        const izipayAmount = parseFloat(amountStr)
        if (Math.abs(izipayAmount - cart.total) > 1) { 
             console.warn(`Izipay Amount mismatch: Cart ${cart.total} vs IziPay ${izipayAmount}`)
        }
    }
    
    const paymentCollection = cart.payment_collection
    if (!paymentCollection) {
        console.error(`No payment collection for cart ${cart.id}`)
        return new StepResponse({ success: false, reason: "No payment collection" })
    }
    
    const paymentSession = paymentCollection.payment_sessions?.find((s: any) => s.provider_id === "izipay") 
        || paymentCollection.payment_sessions?.[0]
        
    if (!paymentSession) {
         console.error(`No payment session for cart ${cart.id}`)
         return new StepResponse({ success: false, reason: "No payment session" })
    }
    
    try {
        await paymentModule.authorizePaymentSession(paymentSession.id, {
            payload: payload
        })
    } catch (e) {
        console.error("Error authorizing payment session:", e)
        return new StepResponse({ success: false, reason: "Authorization failed" })
    }
    
    return new StepResponse({ success: true, cartId: cart.id })
  }
)

export const handleIzipayWebhookWorkflow = createWorkflow(
  "handle-izipay-webhook",
  (input: IzipayWebhookInput) => {
    validateIzipaySignatureStep(input)
    
    const storageResult = storeIzipayEventStep({
        payload: input.payload,
        signature: input.signature
    })
    
    const orderId = transform({ storageResult }, (data) => data.storageResult.event.order_id)
    
    const cart = retrieveCartAndPaymentStep(orderId)
    
    const authResult = validateAndAuthorizeStep({
        cart,
        payload: input.payload
    })
    
    when(authResult, (res) => res.success).then(() => {
        completeCartWorkflow.runAsStep({ input: { id: orderId } })
    })
    
    return new WorkflowResponse(storageResult)
  }
)
