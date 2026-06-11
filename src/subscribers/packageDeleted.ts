import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

type PackageDeletedEventData = {
  id: number
  slug?: string
}

export default async function handlePackageDeletedSync({
  event,
  container
}: SubscriberArgs<PackageDeletedEventData>) {
  const logger = container.resolve("logger")

  logger.info(`[integration.package.deleted.v1] Event received: id=${event.data.id}`)

  try {
    const packageModule = container.resolve<PackageModuleService>(PACKAGE_MODULE)
    const productModule = container.resolve(Modules.PRODUCT)

    const [matchedPackage] = await packageModule.getPackageByMetadata(`${event.data.id}package`)

    if (!matchedPackage) {
      logger.warn(`[integration.package.deleted.v1] Package not found for id=${event.data.id}`)
      return
    }

    const packageM = await packageModule.retrievePackage(matchedPackage.id, {
      relations: ["variants", "bookings", "service_variants"],
    })

    if (packageM.variants?.length) {
      await packageModule.deletePackageVariants(packageM.variants.map((variant) => variant.id))
    }

    if (packageM.bookings?.length) {
      await packageModule.deletePackageBookings(packageM.bookings.map((booking) => booking.id))
    }

    if (packageM.service_variants?.length) {
      await packageModule.deletePackageServiceVariants(
        packageM.service_variants.map((serviceVariant) => serviceVariant.id)
      )
    }

    await packageModule.deletePackages([packageM.id])

    if (packageM.product_id) {
      try {
        await productModule.deleteProducts([packageM.product_id])
        logger.info(`[integration.package.deleted.v1] Deleted linked product: ${packageM.product_id}`)
      } catch (productError) {
        logger.warn(
          `Package deleted but linked product ${packageM.product_id} could not be deleted: ${productError}`
        )
      }
    }

    logger.info(`[integration.package.deleted.v1] Package deleted: ${packageM.id}`)

    try {
      const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
      await eventModuleService.publishEvent({
        type: "integration",
        aggregateType: "package",
        action: "deleted",
        version: 1,
        payload: {
          id: packageM.id,
          productId: packageM.product_id,
        },
        causationId: `medusa:package.deleted:${event.data.id}`,
      })
      logger.info(`Published integration.package.deleted.v1 EDA event for package: ${packageM.id}`)
    } catch (edaError) {
      logger.warn(`Failed to publish package.deleted EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
    }
  } catch (error) {
    logger.error(`[integration.package.deleted.v1] Error: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "integration.package.deleted.v1",
}
