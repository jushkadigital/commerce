import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import createPackageWorkflow from "../workflows/create-package"
import { buildPackageCreateInput, type PackageSyncEventData } from "../utils/package-sync-event"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

export default async function handlePackagePublishedSync({
  event,
  container
}: SubscriberArgs<PackageSyncEventData>) {

  const logger = container.resolve("logger")

  logger.info(`[integration.package.published.v1] Event received: id=${event.data.id} slug=${event.data.slug} destination=${event.data.data.destination}`)

  const { result } = await createPackageWorkflow(container).run({
    input: buildPackageCreateInput(event.data)
  })

  logger.info(`[integration.package.published.v1] Package created: package=${result.package.id} product=${result.package.product_id}`)

  try {
    const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
    const pkg = result.package
    await eventModuleService.publishEvent({
      type: "integration",
      aggregateType: "package",
      action: "published",
      version: 1,
      payload: {
        id: pkg.id,
        productId: pkg.product_id,
        slug: pkg.slug,
        destination: pkg.destination,
        durationDays: pkg.duration_days,
        difficulty: event.data.data.difficulty,
      },
      causationId: `medusa:package.published:${event.data.id}`,
    })
    logger.info(`Published integration.package.published.v1 EDA event for package: ${pkg.id}`)
  } catch (edaError) {
    logger.warn(`Failed to publish package.published EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
  }
}

export const config: SubscriberConfig = {
  event: "integration.package.published.v1",
}
