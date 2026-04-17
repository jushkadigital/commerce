import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"

type PackageDeletedEvent = {
  id?: string
  payloadId?: string
}

export default async function handleTourDeletedSync({
  event,
  container
}: SubscriberArgs<PackageDeletedEvent>) {
  const logger = container.resolve("logger")

  logger.info(`PACKAGE DELETED EVENT RECEIVED: ${JSON.stringify(event.data)}`)

  try {
    const packageModule = container.resolve<PackageModuleService>(PACKAGE_MODULE)
    const productModule = container.resolve(Modules.PRODUCT)

    const externalId = event.data?.id || event.data?.payloadId

    if (!externalId) {
      logger.warn("No external ID found in package.delete event data")
      return
    }

    const [matchedPackage] = await packageModule.getPackageByMetadata(`${externalId}package`)

    if (!matchedPackage) {
      logger.warn(`Package not found for external ID: ${externalId}`)
      return
    }

    const packageM = await packageModule.retrievePackage(matchedPackage.id, {
      relations: ["variants", "bookings", "service_variants"],
    })

    logger.info(`Found package to delete: ${packageM.id} (external ID: ${externalId})`)

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
        logger.info(`Successfully deleted linked product: ${packageM.product_id}`)
      } catch (productError) {
        logger.warn(
          `Package deleted but linked product ${packageM.product_id} could not be deleted: ${productError}`
        )
      }
    }

    logger.info(`Successfully deleted package: ${packageM.id}`)
  } catch (error) {
    logger.error(`Error in packageDeleted subscriber: ${error}`)
  }
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "package.deleted",
}
