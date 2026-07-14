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

/**
 * Optimized two-phase conditional cart fetch for add-to-cart responses.
 *
 * Phase 1: light pre-fetch (cached) — checks if cart has promotions.
 * Phase 2: main fetch — includes promo/adjustment fields only when needed.
 *
 * For carts without promotions (common for tours/packages), this skips
 * ~4 relation queries (items.adjustments, promotions, promotions.application_method),
 * reducing the fetch from ~1000ms to ~600ms.
 *
 * Tax lines are always included (3 fields, 1 query — cheap and needed for display).
 */
export async function refetchAddToCartResultOptimized(
  cartId: string,
  scope: MedusaContainer
) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  // Phase 1: light pre-fetch — check if cart has promotions (cached)
  const { data: meta } = await query.graph(
    {
      entity: "cart",
      fields: ["id", "promotions.id"],
      filters: { id: cartId },
    },
    {
      cache: { enable: true },
    }
  )

  const cartMeta = meta[0]

  // Phase 2: build field list based on what the cart actually has
  const fields: string[] = [
    "id",
    "currency_code",
    "region_id",
    "total",
    "subtotal",
    "tax_total",
    "discount_total",
    "discount_subtotal",
    "discount_tax_total",
    "item_total",
    "item_subtotal",
    "item_tax_total",
    "item_discount_total",
    "shipping_total",
    "shipping_subtotal",
    "shipping_tax_total",
    "metadata",
    "items.id",
    "items.title",
    "items.quantity",
    "items.unit_price",
    "items.thumbnail",
    "items.variant_id",
    "items.product_id",
    "items.metadata",
    "items.requires_shipping",
    "items.tax_lines.id",
    "items.tax_lines.code",
    "items.tax_lines.rate",
  ]

  // Only fetch promotion/adjustment fields when the cart has promotions linked.
  // computeActions fetches ALL active promotions with 10 heavy relations —
  // if the cart has no promo codes, these fields are empty anyway.
  if (cartMeta?.promotions?.length) {
    fields.push(
      "items.adjustments.id",
      "items.adjustments.code",
      "items.adjustments.amount",
      "promotions.id",
      "promotions.code",
      "promotions.is_automatic",
      "promotions.application_method.value",
      "promotions.application_method.type",
      "promotions.application_method.currency_code"
    )
  }

  // Main fetch — no cache (must be fresh after addLineItems)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields,
    filters: { id: cartId },
  })

  return carts[0]
}
