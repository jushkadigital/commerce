import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

export default async function handleProductSync({
  event,
  container
}: SubscriberArgs<any>) {
  const eventName = event.name || "product.created"

  if (event.metadata?.source === "rabbitmq") {
    return
  }

  const productId = event.data?.id

  if (!productId) {
    return
  }

  const productModuleService = container.resolve(Modules.PRODUCT)

  const fullProduct = await productModuleService.retrieveProduct(productId, {
    relations: ["variants", "images", "tags", "categories", "metadata"]
  })

  const variantIds = (fullProduct.variants || []).map((variant: any) => variant.id).filter(Boolean)
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

  const action = eventName === "product.updated" ? "updated" : "synced"

  await eventModuleService.publishEvent({
    type: "integration",
    aggregateType: "product",
    action,
    version: 1,
    payload: fullProductWithPrices,
    causationId: `medusa:${eventName}:${productId}`,
  })
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}