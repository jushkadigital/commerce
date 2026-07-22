import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { EVENTS_MODULE } from "../../modules/events"
import type EventModuleService from "../../modules/events/service"

/**
 * Loads a product with its variants, prices, images, tags, categories and metadata
 * (the same enrichment the productCreated subscriber performs) and publishes the
 * corresponding `integration.product.<action>.v1` event to RabbitMQ directly via the
 * Events module, bypassing the fragile Medusa event-bus round-trip.
 *
 * @param container  Medusa container (req.scope or workflow container)
 * @param productId  The Medusa product id
 * @param action     "synced" (created) or "updated"
 * @param causationId Optional causation id (defaults to medusa:<action>:<productId>)
 */
export async function publishProductEvent(
  container: MedusaContainer,
  productId: string,
  action: "synced" | "updated",
  causationId?: string
): Promise<void> {
  const productModuleService = container.resolve(Modules.PRODUCT)

  const fullProduct = await productModuleService.retrieveProduct(productId, {
    relations: ["variants", "images", "tags", "categories", "metadata"],
  })

  const variantIds = (fullProduct.variants || [])
    .map((variant: any) => variant.id)
    .filter(Boolean)

  let fullProductWithPrices = fullProduct

  if (variantIds.length > 0) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: variantsWithPriceSets } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id", "price_set.prices.*"],
      filters: {
        id: variantIds,
      },
    })

    const variantMap = new Map<string, any>()
    for (const variant of variantsWithPriceSets || []) {
      variantMap.set(variant.id, variant)
    }

    fullProductWithPrices = {
      ...fullProduct,
      variants: (fullProduct.variants || []).map((variant: any) => {
        const variantData = variantMap.get(variant.id)
        const prices = variantData?.price_set?.prices || []

        return {
          ...variant,
          price_set: variantData?.price_set || null,
          prices,
        }
      }),
    }
  }

  const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
  const logger = container.resolve("logger") as any

  const routingKey = `integration.product.${action}.v${1}`

  logger.info(
    `[product-event] Publishing ${routingKey} for product ${productId} (variants: ${(fullProductWithPrices.variants || []).length})`
  )

  await eventModuleService.publishEvent({
    type: "integration",
    aggregateType: "product",
    action,
    version: 1,
    payload: fullProductWithPrices,
    causationId: causationId ?? `medusa:${action}:${productId}`,
  })

  logger.info(`[product-event] Published ${routingKey} for product ${productId}`)
}
