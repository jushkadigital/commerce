import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// ---------------------------------------------------------------------------
// Field lists for conditional cart fetch
// ---------------------------------------------------------------------------

/**
 * Base fields always fetched — needed for the API response (addCartFields from
 * query-config.ts) and cart totals. These are lightweight: items.*, tax_lines,
 * adjustments. No product/variant/customer relations → ~6 DB queries instead of ~20.
 */
export const baseFields: string[] = [
  "id",
  "quantity",
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
  "items.*",
  "items.tax_lines.*",
  "items.adjustments.*",
]

/**
 * Extra fields only needed when the cart has promotions linked.
 * Used by updateCartPromotionsWorkflow → computeActions for promo rule evaluation.
 * Includes promotion display fields (value, code, etc.) and product/customer relations needed for rule evaluation.
 * Adds ~8 DB queries (product relations, customer, groups).
 */
export const promoFields: string[] = [
  "promotions.id",
  "promotions.code",
  "promotions.is_automatic",
  "promotions.application_method.value",
  "promotions.application_method.type",
  "promotions.application_method.currency_code",
  "items.product.id",
  "items.product.is_giftcard",
  "items.product.collection_id",
  "items.product.categories.id",
  "items.product.tags.id",
  "items.product.type_id",
  "customer.*",
  "customer.groups.*",
]

/**
 * Extra fields only needed when the cart has shipping methods.
 * Used by refreshCartShippingMethodsWorkflow.
 * Adds ~6 DB queries (shipping methods, address, variant dimensions).
 */
export const shippingFields: string[] = [
  "shipping_methods.*",
  "shipping_methods.adjustments.*",
  "shipping_methods.tax_lines.*",
  "shipping_methods.shipping_option.shipping_option_type_id",
  "shipping_address.*",
  "items.variant.id",
  "items.variant.weight",
  "items.variant.length",
  "items.variant.height",
  "items.variant.width",
  "items.variant.material",
  "items.product.weight",
]

/**
 * Extra fields only needed when the cart has a payment collection.
 * Used by refreshPaymentCollectionForCartWorkflow.
 * Adds ~2 DB queries (payment_collection, payment_sessions).
 */
export const paymentFields: string[] = [
  "payment_collection.id",
  "payment_collection.raw_amount",
  "payment_collection.amount",
  "payment_collection.currency_code",
  "payment_collection.payment_sessions.id",
]

/**
 * Light pre-fetch fields — just enough to check which sub-workflows need to run.
 * ~4 DB queries, very fast (~100-200ms).
 */
export const metaFields: string[] = [
  "id",
  "promotions.id",
  "shipping_methods.id",
  "payment_collection.id",
]

// ---------------------------------------------------------------------------
// Conditional cart fetch step
// ---------------------------------------------------------------------------

/**
 * Two-phase cart fetch:
 *   Phase 1 — light pre-fetch (4 fields) to check if cart has promotions,
 *             shipping methods, or a payment collection.
 *   Phase 2 — main fetch with only the fields needed for the active sub-workflows.
 *
 * For a tours/packages cart with no promos/shipping/payment (the common case),
 * this reduces the fetch from ~20 DB queries to ~6, cutting 1.7s → ~500-600ms.
 *
 * When sub-workflows DO need to run, their required fields are included so
 * the cart passed to them has everything they need (no internal refetch).
 *
 * Shared between delete-line-items-slim and add-booking-to-cart workflows.
 */
export const conditionalCartFetchStep = createStep(
  "conditional-cart-fetch",
  async (input: { cart_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Phase 1: light pre-fetch — check what relations exist.
    // Cache is safe here: the relations (promotions, shipping_methods,
    // payment_collection) are not affected by line-item mutations
    // (add/delete) that happened in previous steps. Cache hit = <10ms vs ~150ms miss.
    const { data: meta } = await query.graph(
      {
        entity: "cart",
        fields: metaFields,
        filters: { id: input.cart_id },
      },
      {
        cache: { enable: true },
      }
    )

    const cartMeta = meta[0]

    // Phase 2: build field list based on what the cart actually has
    const fields = [...baseFields]

    if (cartMeta?.promotions?.length) {
      fields.push(...promoFields)
    }

    if (cartMeta?.shipping_methods?.length) {
      fields.push(...shippingFields)
    }

    if (cartMeta?.payment_collection) {
      fields.push(...paymentFields)
    }

    // Main fetch with only the needed fields.
    // NO cache — line items were mutated (added/deleted) in a previous step and
    // we must see the fresh state (items, totals). Cache would risk returning stale data.
    const { data: carts } = await query.graph({
      entity: "cart",
      fields,
      filters: { id: input.cart_id },
    })

    return new StepResponse(carts[0])
  }
)

// ---------------------------------------------------------------------------
// Cart cache invalidation step
// ---------------------------------------------------------------------------

/**
 * Invalidates all cached cart queries for a given cart_id.
 *
 * When MEDUSA_FF_CACHING=true, the native GET /store/carts/:id endpoint caches
 * cart data (30s default TTL). After a mutation (add/delete items), the cache is
 * NOT automatically invalidated by Medusa — so the frontend sees a stale empty
 * cart for up to 30 seconds.
 *
 * This step calls `cache.invalidate("cart:*<cart_id>*")` to clear all cached
 * entries for this cart, ensuring the next GET /store/carts/:id returns fresh data.
 *
 * Runs after the mutation step (createLineItemsStep / deleteLineItemsStep) and
 * before the conditionalCartFetchStep, so even our own phase-1 pre-fetch cache
 * is cleared and re-populated with fresh data.
 */
export const invalidateCartCacheStep = createStep(
  "invalidate-cart-cache",
  async (input: { cart_id: string }, { container }) => {
    const cache = container.resolve(Modules.CACHE)
    if (cache?.invalidate) {
      // Wildcard pattern matches all cache keys containing this cart_id
      await cache.invalidate(`*${input.cart_id}*`)
    }
    return new StepResponse(input.cart_id)
  },
  async () => {
    // no compensation — cache will be re-populated on next read
  }
)
