import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { defaultStoreCartFields, addCartFields } from "../../query-config"

/**
 * Refetches a cart with all fields required by the storefront, including
 * promotions, discounts, and tax lines. This ensures consistent responses
 * across all cart mutation endpoints.
 */
export async function refetchPromotionAwareCart(
  cartId: string,
  scope: MedusaContainer
) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: defaultStoreCartFields,
    filters: { id: cartId },
  })

  return carts[0]
}

/**
 * Refetches a cart with a reduced field set optimized for add-to-cart
 * responses. Faster than refetchPromotionAwareCart while still returning
 * all data the storefront needs immediately after adding items.
 */
export async function refetchAddToCartResult(
  cartId: string,
  scope: MedusaContainer
) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: addCartFields,
    filters: { id: cartId },
  })

  return carts[0]
}
