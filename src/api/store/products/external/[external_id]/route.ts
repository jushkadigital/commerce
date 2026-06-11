import {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "@medusajs/medusa/api/utils/middlewares/index"
import { wrapProductsWithTaxPrices } from "@medusajs/medusa/api/store/products/helpers"
import { trackCommerceEvent, type TrackingItem } from "../../../../../utils/conversion-tracking"

const baseExternalProductFields = [
  "id",
  "title",
  "subtitle",
  "description",
  "handle",
  "thumbnail",
  "status",
  "external_id",
  "metadata",
  "created_at",
  "updated_at",
  "tags.*",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.barcode",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.thumbnail",
  "sales_channels.id",
  "tour.id",
  "tour.slug",
  "tour.destination",
  "tour.duration_days",
  "tour.max_capacity",
  "tour.thumbnail",
  "tour.is_special",
  "package.id",
  "package.slug",
  "package.destination",
  "package.duration_days",
  "package.max_capacity",
  "package.thumbnail",
  "package.is_special",
]

type ProductVariantWithPrice = {
  id?: string
  title?: string
  calculated_price?: {
    calculated_amount?: number | string
  }
}

type RequestWithAuthContext = MedusaStoreRequest & {
  auth_context?: {
    actor_id?: string
  }
}

type ExternalProductRecord = {
  id?: string
  title?: string
  external_id?: string
  variants?: ProductVariantWithPrice[]
  sales_channels?: Array<{ id?: string }>
  tour?: {
    id?: string
    destination?: string
  }
  package?: {
    id?: string
    destination?: string
  }
}

const throwNotFound = (message?: string): never => {
  throw new MedusaError(
    MedusaError.Types.NOT_FOUND,
    message || "Product by external not found"
  )
}

const EXTERNAL_PRODUCT_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=600"

const CACHE_VARY_HEADERS = ["x-publishable-api-key", "x-medusa-locale"]
const AUTH_CACHE_VARY_HEADERS = ["Authorization", "Cookie"]

const appendVaryHeaders = (res: MedusaResponse, headers: string[]) => {
  const existing = res.getHeader("Vary")
  const values = new Set<string>()

  if (typeof existing === "string") {
    for (const value of existing.split(",")) {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    }
  }

  for (const header of headers) {
    values.add(header)
  }

  res.setHeader("Vary", Array.from(values).join(", "))
}

const shouldIncludeInventoryQuantity = (req: MedusaStoreRequest): boolean => {
  const value = req.query.include_inventory_quantity

  if (typeof value !== "string") {
    return false
  }

  return value === "1" || value.toLowerCase() === "true"
}

const shouldIncludeCalculatedPrice = (
  regionId?: string,
  currencyCode?: string
): boolean => {
  return Boolean(regionId || currencyCode)
}

export async function GET(
  req: MedusaStoreRequest,
  res: MedusaResponse
) {
  const requestWithAuth = req as RequestWithAuthContext
  const externalId = req.params.external_id
  const regionId = req.query.region_id as string | undefined
  const currencyCode = req.query.currency_code as string | undefined
  const includeInventoryQuantity = shouldIncludeInventoryQuantity(req)
  const includeCalculatedPrice = shouldIncludeCalculatedPrice(regionId, currencyCode)
  const salesChannelIds = req.publishable_key_context?.sales_channel_ids ?? []

  if (!salesChannelIds.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Publishable key needs to have a sales channel configured"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = req.scope.resolve("logger")
  const fields = [...baseExternalProductFields]

  if (includeCalculatedPrice) {
    fields.push("variants.calculated_price.*")
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields,
    filters: {
      external_id: externalId,
      status: ProductStatus.PUBLISHED,
    },
    ...(includeCalculatedPrice
      ? {
          context: {
            variants: {
              calculated_price: QueryContext({
                region_id: regionId,
                currency_code: currencyCode,
              }),
            },
          },
        }
      : {}),
  }, {
    cache: {
      enable: true,
    },
    locale: req.locale,
  })

  const product = products[0]

  if (!product) {
    throwNotFound()
  }

  const productRecord = product as ExternalProductRecord

  if (!productRecord.id) {
    throwNotFound()
  }

  // Verify product belongs to an allowed sales channel (replaces 2nd DB query)
  const productChannelIds = (productRecord.sales_channels || []).map(
    (sc) => sc.id
  )
  const belongsToAllowedChannel = productChannelIds.some(
    (id) => id && salesChannelIds.includes(id)
  )

  if (!belongsToAllowedChannel) {
    throwNotFound()
  }

  if (includeInventoryQuantity) {
    const variants = products.flatMap((entry) => {
      const record = entry as ExternalProductRecord
      return Array.isArray(record.variants) ? record.variants : []
    })

    type InventoryWrapperRequest = Parameters<
      typeof wrapVariantsWithInventoryQuantityForSalesChannel
    >[0]
    type InventoryWrapperVariants = Parameters<
      typeof wrapVariantsWithInventoryQuantityForSalesChannel
    >[1]

    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req as unknown as InventoryWrapperRequest,
      variants as InventoryWrapperVariants
    )
  }

  // Wrap variants with tax-inclusive pricing (matches native Medusa product endpoint)
  if (includeCalculatedPrice) {
    await wrapProductsWithTaxPrices(req, [product as any])
  }

  const hasAuthHeaders =
    typeof req.headers.authorization === "string" ||
    typeof req.headers.cookie === "string"

  if (hasAuthHeaders) {
    res.setHeader("Cache-Control", "private, no-store")
    appendVaryHeaders(res, [...CACHE_VARY_HEADERS, ...AUTH_CACHE_VARY_HEADERS])
  } else {
    res.setHeader("Cache-Control", EXTERNAL_PRODUCT_CACHE_CONTROL)
    appendVaryHeaders(res, CACHE_VARY_HEADERS)
  }

  const contentCategory = productRecord.tour?.id
    ? "tour"
    : productRecord.package?.id
      ? "package"
      : "product"
  const contentId =
    productRecord.external_id ||
    productRecord.tour?.id ||
    productRecord.package?.id ||
    productRecord.id
  const firstVariantPrice = productRecord.variants
    ?.map((variant) => Number(variant?.calculated_price?.calculated_amount))
    .find((amount) => Number.isFinite(amount))
  const trackingItems: TrackingItem[] = contentId
    ? [
        {
          contentId,
          contentType: contentCategory,
          contentCategory,
          contentName:
            productRecord.tour?.destination ||
            productRecord.package?.destination ||
            productRecord.title,
          ...(typeof firstVariantPrice === "number" ? { price: firstVariantPrice } : {}),
        },
      ]
    : []

  res.json({ product })

  // Fire-and-forget tracking (non-blocking, after response sent)
  if (trackingItems.length > 0) {
    trackCommerceEvent({
      eventName: "ViewContent",
      eventId: `view_content:${externalId}:${Date.now()}`,
      trigger: "store.products.external.get",
      request: req,
      currency: currencyCode,
      items: trackingItems,
      user: {
        externalId: requestWithAuth.auth_context?.actor_id,
      },
      logger,
    }).catch((err) => {
      logger?.error?.("[tracking] ViewContent event failed (non-blocking)", err)
    })
  }
}
