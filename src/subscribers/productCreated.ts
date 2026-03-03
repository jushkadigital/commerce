import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { RABBITMQ_EVENT_BUS_MODULE } from "../modules/event-bus-rabbitmq"

export default async function handleProductSync({
  event,
  container
}: SubscriberArgs<any>) {
  const logger = container.resolve("logger")

  if (event.metadata?.source === "rabbitmq") {
    logger.info(`Skipping product.created from RabbitMQ (already processed)`)
    return
  }


  logger.info(`PRODUCT CREATED`)
  logger.info(`${JSON.stringify(event)}`)

  try {
    const productId = event.data?.id

    if (!productId) {
      logger.warn("Product ID not found in event data")
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

    logger.info(`Loaded full product: ${JSON.stringify(fullProductWithPrices)}`)

    const rabbitMQEventBus = container.resolve(RABBITMQ_EVENT_BUS_MODULE)

    await rabbitMQEventBus.emit({
      name: "product.created",
      data: fullProductWithPrices
    })

    logger.info(`Published product.created to RabbitMQ for product: ${productId}`)
  } catch (error) {
    logger.error(`Error in productCreated subscriber: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
}
