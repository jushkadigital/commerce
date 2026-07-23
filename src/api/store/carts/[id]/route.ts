import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { updateCartWorkflowId } from "@medusajs/medusa/core-flows"

// ---------------------------------------------------------------------------
// Route-local API field groups for GET/POST /store/carts/:id
//
// These are tuned for the API *response* (storefront-facing) and are kept
// separate from the workflow-internal `baseFields` in
// `src/workflows/steps/conditional-cart-fetch.ts`, which were designed for
// sub-workflow inputs (not the public response shape). Reusing those would
// (a) fetch a non-existent `quantity` column on the Cart model, (b) omit
// shipping/billing addresses, and (c) drop response fields the storefront
// expects (email, region, customer, original_* totals).
// ---------------------------------------------------------------------------

/**
 * Fields returned for EVERY cart, regardless of state. These mirror the
 * subset of `defaultStoreCartFields` (query-config.ts) that a storefront
 * needs on every cart fetch: cart scalars + all totals + items (+ tax lines
 * + adjustments) + both addresses + region basics + customer basics.
 *
 * `items.*` expands to all line-item scalar/computed columns, so the
 * denormalized display fields (product_title, variant_sku, product_handle,
 * ...) are covered without listing them individually.
 *
 * Deliberately EXCLUDED from the always-set (only fetched when the cart
 * actually has the relation):
 *  - promotions.* + application_method.*  → promoFields
 *  - items.product.categories/tags, customer.groups  → promoFields
 *  - shipping_methods.* + variant dimensions  → shippingFields
 *  - payment_collection.* + payment_sessions.*  → paymentFields
 *  - region.countries.*  → not fetched (only used at cart-creation time for
 *    single-country auto-fill; storefront can request via ?fields=)
 *  - credit_lines.*  → not fetched (not referenced by storefront)
 */
const apiBaseFields: string[] = [
  // Cart scalars
  "id",
  "currency_code",
  "email",
  "locale",
  "region_id",
  "created_at",
  "updated_at",
  "completed_at",
  "sales_channel_id",
  // Totals (computed)
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "discount_subtotal",
  "discount_tax_total",
  "original_total",
  "original_tax_total",
  "item_total",
  "item_subtotal",
  "item_tax_total",
  "item_discount_total",
  "original_item_total",
  "original_item_subtotal",
  "original_item_tax_total",
  "shipping_total",
  "shipping_subtotal",
  "shipping_tax_total",
  "shipping_discount_total",
  "original_shipping_tax_total",
  "original_shipping_subtotal",
  "original_shipping_total",
  "credit_line_subtotal",
  "credit_line_tax_total",
  "credit_line_total",
  "metadata",
  // Items + their tax lines and adjustments (items.* covers denormalized
  // display fields: product_title, variant_sku, product_handle, ...)
  "items.*",
  "items.tax_lines.*",
  "items.adjustments.*",
  // Addresses — ALWAYS fetched. A cart can have a billing/shipping address
  // set WITHOUT shipping methods (e.g. checkout before method selection, or
  // digital/tour purchases). Gating these on shipping_methods would break
  // address display mid-checkout.
  "shipping_address.*",
  "billing_address.*",
  // Region basics
  "region.id",
  "region.name",
  "region.currency_code",
  "region.automatic_taxes",
  // Customer basics
  "customer.id",
  "customer.email",
]

/**
 * Cheap ID-level joins added to phase 1 to detect which optional groups are
 * actually needed, so the heavy relations are only fetched when present.
 */
const probeFields: string[] = [
  "promotions.id",
  "shipping_methods.id",
  "payment_collection.id",
]

/**
 * Promotion fields — only when the cart has promotions linked.
 * Includes product/customer relations needed for promo rule evaluation.
 */
const promoFields: string[] = [
  "promotions.id",
  "promotions.code",
  "promotions.is_automatic",
  "promotions.is_tax_inclusive",
  "promotions.application_method.value",
  "promotions.application_method.type",
  "promotions.application_method.currency_code",
  "items.product.id",
  "items.product.is_giftcard",
  "items.product.collection_id",
  "items.product.categories.id",
  "items.product.tags.id",
  "items.product.type_id",
  "customer.groups.id",
]

/**
 * Shipping-method fields — only when the cart has shipping methods.
 * Includes variant dimensions needed by refreshCartShippingMethodsWorkflow.
 */
const shippingFields: string[] = [
  "shipping_methods.*",
  "shipping_methods.tax_lines.*",
  "shipping_methods.adjustments.*",
  "shipping_methods.shipping_option_id",
  "shipping_methods.shipping_option.shipping_option_type_id",
  "items.variant.id",
  "items.variant.weight",
  "items.variant.length",
  "items.variant.height",
  "items.variant.width",
  "items.variant.material",
  "items.product.weight",
]

/**
 * Payment fields — only when the cart has a payment collection.
 * Mirrors the native `payment_collection.*` + `payment_sessions.*`.
 */
const paymentFields: string[] = [
  "payment_collection.*",
  "payment_collection.payment_sessions.*",
]

/**
 * Optimized cart fetch for GET/POST /store/carts/:id.
 *
 * Replaces the native `refetchCart` which always fetches all 133
 * defaultStoreCartFields (~20 DB queries, ~2s). Uses a conditional
 * two-phase fetch:
 *   - Phase 1: apiBaseFields + probeFields (cheap ID joins) to detect which
 *     optional groups (promotions/shipping/payment) the cart actually has.
 *   - Phase 2: only when needed, re-fetch base + the extra group fields.
 *
 * For a cart with no promos/shipping/payment (common tours/packages case)
 * this is a single query (~10 joins) instead of ~20, cutting latency from
 * ~2s to ~500-700ms while preserving the response shape the storefront
 * relies on (addresses, region, customer, all totals).
 *
 * When the client passes an explicit `?fields=` query param, those merged
 * fields are used directly (respecting client intent, like the native
 * endpoint which forwards req.queryConfig.fields).
 *
 * Note on caching: `query.graph` only caches when an options object with
 * `cache.enable === true` is passed (2nd argument). No options are passed
 * here, matching the native `refetchCart` (which uses `remoteQuery` without
 * cache options) — so neither path caches, and there is no risk of stale
 * phase-1/phase-2 contamination.
 */
const refetchOptimizedCart = async (
  cartId: string,
  scope: any,
  request?: MedusaRequest
): Promise<Record<string, unknown>> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  // Client explicitly requested fields — respect their intent (mirrors the
  // native endpoint forwarding req.queryConfig.fields to refetchCart).
  if (request && hasExplicitFieldsQuery(request)) {
    const fields = request.queryConfig?.fields
    if (Array.isArray(fields) && fields.length > 0) {
      const { data: carts } = await query.graph({
        entity: "cart",
        fields,
        filters: { id: cartId },
      })

      if (!carts[0]) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Cart with id '${cartId}' not found`
        )
      }
      return carts[0]
    }
  }

  // Phase 1: base fields + cheap ID-level joins to detect which optional
  // field groups are actually needed.
  const phase1Fields = [...apiBaseFields, ...probeFields]

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: phase1Fields,
    filters: { id: cartId },
  })

  const cart = carts[0]
  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id '${cartId}' not found`
    )
  }

  // Determine which extra fields are needed based on what the cart has.
  const extraFields: string[] = []

  if (cart.promotions?.length) {
    extraFields.push(...promoFields)
  }

  if (cart.shipping_methods?.length) {
    extraFields.push(...shippingFields)
  }

  if (cart.payment_collection) {
    extraFields.push(...paymentFields)
  }

  // Common case: no extra fields needed — return phase 1 result (1 query).
  if (extraFields.length === 0) {
    return cart
  }

  // Phase 2: fetch base + extra fields.
  const { data: cartsWithExtra } = await query.graph({
    entity: "cart",
    fields: [...phase1Fields, ...extraFields],
    filters: { id: cartId },
  })

  // Null check: the cart could be deleted/completed between phase 1 and
  // phase 2 (concurrent request). Preserve native NOT_FOUND behavior
  // instead of returning { cart: undefined }.
  const cartWithExtra = cartsWithExtra[0]
  if (!cartWithExtra) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id '${cartId}' not found`
    )
  }

  return cartWithExtra
}

const hasExplicitFieldsQuery = (req: MedusaRequest): boolean => {
  const rawFields = req.query.fields

  if (typeof rawFields === "string") {
    return rawFields.trim().length > 0
  }

  if (Array.isArray(rawFields)) {
    return rawFields.length > 0
  }

  return false
}

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const cart = await refetchOptimizedCart(req.params.id, req.scope, req)
  res.json({ cart })
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Replicate native update handler: run updateCartWorkflow, then refetch.
  // Note: unlike the cart-creation POST (src/api/store/carts/route.ts),
  // the update workflow does NOT inject customer_id from auth_context.
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  const body =
    typeof req.validatedBody === "object" && req.validatedBody !== null
      ? (req.validatedBody as Record<string, unknown>)
      : {}

  await we.run(updateCartWorkflowId, {
    input: {
      ...body,
      id: req.params.id,
      additional_data: body.additional_data,
    },
  })

  const cart = await refetchOptimizedCart(req.params.id, req.scope, req)

  res.status(200).json({ cart })
}
