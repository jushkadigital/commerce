import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import createPackageWorkflow from "../workflows/create-package"
import { buildPackageCreateInput, type PackageSyncEventData } from "../utils/package-sync-event"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

export default async function handlePackageUpdatedSync({
  event,
  container
}: SubscriberArgs<PackageSyncEventData>) {

  const logger = container.resolve("logger")

  const packageModule = container.resolve<PackageModuleService>(PACKAGE_MODULE)

  logger.info(`[integration.package.updated.v1] Event received: id=${event.data.id} slug=${event.data.slug} destination=${event.data.data.destination}`)

  const [matchedPackage] = await packageModule.getPackageByMetadata(`${event.data.id}package`)

  if (!matchedPackage) {
    logger.info(`[integration.package.updated.v1] Package not found for id=${event.data.id}, creating instead`)

    const { result } = await createPackageWorkflow(container).run({
      input: buildPackageCreateInput(event.data)
    })

    logger.info(`[integration.package.updated.v1] Package created: package=${result.package.id} product=${result.package.product_id}`)

    try {
      const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
      const pkg = result.package
      await eventModuleService.publishEvent({
        type: "integration",
        aggregateType: "package",
        action: "updated",
        version: 1,
        payload: {
          id: pkg.id,
          productId: pkg.product_id,
          slug: pkg.slug,
          destination: pkg.destination,
          durationDays: pkg.duration_days,
          difficulty: event.data.data.difficulty,
        },
        causationId: `medusa:package.updated:${event.data.id}`,
      })
      logger.info(`Published integration.package.updated.v1 EDA event for new package: ${pkg.id}`)
    } catch (edaError) {
      logger.warn(`Failed to publish package.updated EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
    }

    return
  }

  const updatedPackage = await packageModule.updatePackages([{
    id: matchedPackage.id,
    destination: event.data.data.destination,
    duration_days: event.data.data.duration_days,
  }])

  logger.info(`[integration.package.updated.v1] Package updated: ${matchedPackage.id}`)

  try {
    const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
    const pkg = Array.isArray(updatedPackage) ? updatedPackage[0] : updatedPackage
    await eventModuleService.publishEvent({
      type: "integration",
      aggregateType: "package",
      action: "updated",
      version: 1,
      payload: {
        id: pkg.id,
        productId: pkg.product_id,
        slug: pkg.slug,
        destination: pkg.destination,
        durationDays: pkg.duration_days,
        difficulty: event.data.data.difficulty,
      },
      causationId: `medusa:package.updated:${event.data.id}`,
    })
    logger.info(`Published integration.package.updated.v1 EDA event for package: ${pkg.id}`)
  } catch (edaError) {
    logger.warn(`Failed to publish package.updated EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
  }
}

export const config: SubscriberConfig = {
  event: "integration.package.updated.v1",
}
