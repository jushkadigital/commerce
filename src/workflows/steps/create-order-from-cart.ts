import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type CreateOrderFromCartStepInput = {
  cart_id: string
}

export const createOrderFromCartStep = createStep(
  "create-order-from-cart",
  async (input: CreateOrderFromCartStepInput, { container }) => {
    const orderModule = container.resolve(Modules.ORDER) as any
    const paymentModule = container.resolve(Modules.PAYMENT)
    const query = container.resolve("query")
    
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "*",
        "items.*",
        "payment_collection.id",
      ],
      filters: {
        id: input.cart_id,
      },
    })
    
    const cart = carts[0]
    
    if (!cart) {
      throw new Error(`Cart with id ${input.cart_id} not found`)
    }
    
    if (!cart.payment_collection?.id) {
      throw new Error(`Payment collection not found for cart ${input.cart_id}`)
    }
    
    const paymentSessions = await paymentModule.listPaymentSessions({
      payment_collection_id: cart.payment_collection.id,
    })
    
    const paymentSession = paymentSessions[0]
    
    if (!paymentSession) {
      throw new Error(`Payment session not found for cart ${input.cart_id}`)
    }
    
    await paymentModule.authorizePaymentSession(paymentSession.id, {})
    
    const orderItems = cart.items?.map((item: any) => ({
      title: item.title || "Tour Item",
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      variant_id: item.variant_id,
      product_id: item.product_id,
      metadata: item.metadata,
    })) || []
    
    const order = await orderModule.createOrders({
      email: cart.email,
      currency_code: cart.currency_code,
      items: orderItems,
      region_id: cart.region_id,
      customer_id: cart.customer_id,
      sales_channel_id: cart.sales_channel_id,
    })
    
    return new StepResponse(order)
  }
)

export default createOrderFromCartStep
