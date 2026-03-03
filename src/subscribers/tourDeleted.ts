import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { TOUR_MODULE } from "../modules/tour"

export default async function handleTourDeletedSync({
  event,
  container
}: SubscriberArgs<any>) {

  const logger = container.resolve("logger")

  logger.info(`TOUR DELETED EVENT RECEIVED: ${JSON.stringify(event.data)}`)

  try {
    const tourModule = container.resolve(TOUR_MODULE)

    // The event data should contain the external ID (payloadId) to find the tour
    const externalId = event.data?.id || event.data?.payloadId

    if (!externalId) {
      logger.warn("No external ID found in tour.delete event data")
      return
    }

    // Find the tour by metadata.payloadId
    const [tour] = await tourModule.getTourByMetadata(externalId)

    if (!tour) {
      logger.warn(`Tour not found for external ID: ${externalId}`)
      return
    }

    logger.info(`Found tour to delete: ${tour.id} (external ID: ${externalId})`)

    // Delete the tour from Medusa
    await tourModule.deleteTours([tour.id])

    logger.info(`Successfully deleted tour: ${tour.id}`)
  } catch (error) {
    logger.error(`Error in tourDeleted subscriber: ${error}`)
  }
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "tour.deleted",
}
