import { createWorkflow, WorkflowResponse, createStep, StepResponse, transform, when } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import crypto from "crypto"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import { resolveIzipayConfig } from "../utils/izipay-config"

function parseJsonValue(value: unknown): Record<string, any> | null {
  if (!value) {
    return null
  }

  if (typeof value === "object") {
    return value as Record<string, any>
  }

  if (typeof value !== "string") {
    return null
  }

  try {
    return JSON.parse(value) as Record<string, any>
  } catch {
    return null
  }
}

function getIzipayAnswerPayload(payload: Record<string, any>): Record<string, any> {
  return parseJsonValue(payload["kr-answer"]) ?? payload
}

function getIzipayOrderDetails(payload: Record<string, any>): Record<string, any> {
  const answer = getIzipayAnswerPayload(payload)

  if (payload.response?.order?.[0] && typeof payload.response.order[0] === "object") {
    return payload.response.order[0] as Record<string, any>
  }

  if (answer.orderDetails && typeof answer.orderDetails === "object") {
    return answer.orderDetails as Record<string, any>
  }

  return {}
}

function getIzipayTransactionId(payload: Record<string, any>): string {
  const answer = getIzipayAnswerPayload(payload)

  if (typeof payload.transactionId === "string" && payload.transactionId.length > 0) {
    return payload.transactionId
  }

  if (Array.isArray(answer.transactions) && answer.transactions[0]?.uuid) {
    return String(answer.transactions[0].uuid)
  }

  return "unknown"
}

function getIzipayOrderId(payload: Record<string, any>): string {
  const orderDetails = getIzipayOrderDetails(payload)

  if (typeof orderDetails.orderNumber === "string" && orderDetails.orderNumber.length > 0) {
    return orderDetails.orderNumber
  }

  if (typeof orderDetails.orderId === "string" && orderDetails.orderId.length > 0) {
    return orderDetails.orderId
  }

  return "unknown"
}

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
    const { hashKey } = resolveIzipayConfig(process.env.NODE_ENV)
    const code = input.payload?.code
    
    if (!hashKey) {
        throw new Error("Izipay hash key is not configured for the current NODE_ENV")
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
        const body = input.payload as Record<string, any>
        transactionId = getIzipayTransactionId(body)
        orderId = getIzipayOrderId(body)
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

    const orderDetails = getIzipayOrderDetails(payload as Record<string, any>)
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

type PreviousBookingStatus = {
  id: string
  status: string | null
  kind: "tour" | "package"
}

export const confirmBookingsForOrderStep = createStep(
  "confirm-bookings-for-order",
  async (orderId: string, { container }) => {
    if (!orderId) {
      return new StepResponse({ updated_count: 0 }, [])
    }

    const tourModuleService = container.resolve(TOUR_MODULE) as TourModuleService
    const packageModuleService = container.resolve(PACKAGE_MODULE) as PackageModuleService

    const [tourBookings, packageBookings] = await Promise.all([
      tourModuleService.listTourBookings({ order_id: orderId }),
      packageModuleService.listPackageBookings({ order_id: orderId }),
    ])

    const tourBookingsToConfirm = tourBookings.filter((booking) => booking.status === "pending")
    const packageBookingsToConfirm = packageBookings.filter((booking) => booking.status === "pending")

    await Promise.all([
      ...tourBookingsToConfirm.map((booking) =>
        tourModuleService.updateTourBookings({ id: booking.id }, { status: "confirmed" })
      ),
      ...packageBookingsToConfirm.map((booking) =>
        packageModuleService.updatePackageBookings({ id: booking.id }, { status: "confirmed" })
      ),
    ])

    const previousStatuses: PreviousBookingStatus[] = [
      ...tourBookingsToConfirm.map((booking) => ({
        id: booking.id,
        status: booking.status ?? null,
        kind: "tour" as const,
      })),
      ...packageBookingsToConfirm.map((booking) => ({
        id: booking.id,
        status: booking.status ?? null,
        kind: "package" as const,
      })),
    ]

    return new StepResponse(
      {
        updated_count: previousStatuses.length,
      },
      previousStatuses
    )
  },
  async (previousStatuses: PreviousBookingStatus[], { container }) => {
    if (!Array.isArray(previousStatuses) || previousStatuses.length === 0) {
      return
    }

    const tourModuleService = container.resolve(TOUR_MODULE) as TourModuleService
    const packageModuleService = container.resolve(PACKAGE_MODULE) as PackageModuleService

    await Promise.all(
      previousStatuses.map((booking) => {
        const restoredStatus = booking.status === "confirmed" ? "confirmed" : "pending"

        if (booking.kind === "tour") {
          return tourModuleService.updateTourBookings({ id: booking.id }, { status: restoredStatus })
        }

        return packageModuleService.updatePackageBookings(
          { id: booking.id },
          { status: restoredStatus }
        )
      })
    )
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
    
    const cartId = transform({ storageResult }, (data) => data.storageResult.event.order_id)
    
    const cart = retrieveCartAndPaymentStep(cartId)
    
    const authResult = validateAndAuthorizeStep({
        cart,
        payload: input.payload
    })
    
    when(authResult, (res) => res.success).then(() => {
        const { id: completedOrderId } = completeCartWorkflow.runAsStep({
            input: { id: cartId }
        }).config({ name: "complete-izipay-cart" })

        confirmBookingsForOrderStep(completedOrderId).config({
            name: "confirm-izipay-bookings"
        })
    })
    
    return new WorkflowResponse(storageResult)
  }
)
