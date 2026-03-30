import type { CreateCartDTO } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const createEmptyCartStep = createStep(
  "create-empty-cart",
  async (input: CreateCartDTO, { container }) => {
    const cartModuleService = container.resolve(Modules.CART)
    const createdCarts = await cartModuleService.createCarts([input])
    const createdCart = Array.isArray(createdCarts)
      ? createdCarts[0]
      : createdCarts

    return new StepResponse(createdCart, createdCart.id)
  },
  async (cartId: string | undefined, { container }) => {
    if (!cartId) {
      return
    }

    const cartModuleService = container.resolve(Modules.CART)
    await cartModuleService.deleteCarts(cartId)
  }
)
