import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { PACKAGE_MODULE } from "../modules/package"

export default async function handleTourDeletedSync({
  event,
  container
}: SubscriberArgs<any>) {

  const logger = container.resolve("logger")

  logger.info(`TOUR DELETED EVENT RECEIVED: ${JSON.stringify(event.data)}`)

  try {
    const packageModule = container.resolve(PACKAGE_MODULE)

    // The event data should contain the external ID (payloadId) to find the tour
    const externalId = event.data?.id || event.data?.payloadId

    if (!externalId) {
      logger.warn("No external ID found in package.delete event data")
      return
    }

    // Find the tour by metadata.payloadId
    const [packageM] = await packageModule.getPackageByMetadata(externalId + "package");

    if (!packageM) {
      logger.warn(`Package not found for external ID: ${externalId}`)
      return
    }

    logger.info(`Found package to delete: ${packageM.id} (external ID: ${externalId})`)

    // Delete the tour from Medusa
    await packageModule.deletePackages([packageM.id])

    logger.info(`Successfully deleted package: ${packageM.id}`)
  } catch (error) {
    logger.error(`Error in packageDeleted subscriber: ${error}`)
  }
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "package.deleted",
}
