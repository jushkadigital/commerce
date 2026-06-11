import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

type TourDeletedEvent = {
  id?: string
  payloadId?: string
}

export default async function handleTourDeletedSync({
  event,
  container
}: SubscriberArgs<TourDeletedEvent>) {
  const logger = container.resolve("logger")

  logger.info(`[integration.tour.deleted.v1] Event received: id=${event.data?.id || event.data?.payloadId}`)

  try {
    const tourModule = container.resolve<TourModuleService>(TOUR_MODULE)
    const productModule = container.resolve(Modules.PRODUCT)

    const externalId = event.data?.id || event.data?.payloadId

    if (!externalId) {
      logger.warn("No external ID found in tour.delete event data")
      return
    }

    const [matchedTour] = await tourModule.getTourByMetadata(`${externalId}tour`)

    if (!matchedTour) {
      logger.warn(`Tour not found for external ID: ${externalId}`)
      return
    }

    const tour = await tourModule.retrieveTour(matchedTour.id, {
      relations: ["variants", "bookings", "service_variants"],
    })

    logger.info(`Found tour to delete: ${tour.id} (external ID: ${externalId})`)

    if (tour.variants?.length) {
      await tourModule.deleteTourVariants(tour.variants.map((variant) => variant.id))
    }

    if (tour.bookings?.length) {
      await tourModule.deleteTourBookings(tour.bookings.map((booking) => booking.id))
    }

    if (tour.service_variants?.length) {
      await tourModule.deleteTourServiceVariants(
        tour.service_variants.map((serviceVariant) => serviceVariant.id)
      )
    }

    await tourModule.deleteTours([tour.id])

    if (tour.product_id) {
      try {
        await productModule.deleteProducts([tour.product_id])
        logger.info(`Successfully deleted linked product: ${tour.product_id}`)
      } catch (productError) {
        logger.warn(
          `Tour deleted but linked product ${tour.product_id} could not be deleted: ${productError}`
        )
      }
    }

    logger.info(`Successfully deleted tour: ${tour.id}`)

    // Publish enriched event to EDA module
    try {
      const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
      await eventModuleService.publishEvent({
        type: "integration",
        aggregateType: "tour",
        action: "deleted",
        version: 1,
        payload: {
          id: tour.id,
          productId: tour.product_id,
        },
        causationId: `medusa:tour.deleted:${externalId}`,
      })
      logger.info(`Published integration.tour.deleted.v1 for tour: ${tour.id}`)
    } catch (edaError) {
      logger.warn(`Failed to publish tour.deleted EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
    }
  } catch (error) {
    logger.error(`Error in tourDeleted subscriber: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "integration.tour.deleted.v1",
}
