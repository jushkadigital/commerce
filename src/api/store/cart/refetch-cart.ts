import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { defaultStoreCartFields } from "../../query-config"

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
