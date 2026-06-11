import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import createTourWorkflow from "../workflows/create-tour"
import { buildTourCreateInput, type TourSyncEventData } from "../utils/tour-sync-event"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

export default async function handleToursUpdatedSync({
  event,
  container
}: SubscriberArgs<TourSyncEventData>) {

  const logger = container.resolve("logger")

  const tourModule = container.resolve<TourModuleService>(TOUR_MODULE)

  logger.info(`[integration.tour.updated.v1] Event received: id=${event.data.id} slug=${event.data.slug} destination=${event.data.data.destination}`)

  const [matchedTour] = await tourModule.getTourByMetadata(`${event.data.id}tour`)

  if (!matchedTour) {
    logger.info(`[integration.tour.updated.v1] Tour not found for id=${event.data.id}, creating instead`)

    const { result } = await createTourWorkflow(container).run({
      input: buildTourCreateInput(event.data)
    })

    logger.info(`[integration.tour.updated.v1] Tour created: tour=${result.tour.id} product=${result.tour.product_id}`)

    try {
      const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
      const tour = result.tour
      await eventModuleService.publishEvent({
        type: "integration",
        aggregateType: "tour",
        action: "updated",
        version: 1,
        payload: {
          id: tour.id,
          productId: tour.product_id,
          slug: tour.slug,
          destination: tour.destination,
          durationDays: tour.duration_days,
          difficulty: event.data.data.difficulty,
        },
        causationId: `medusa:tour.updated:${event.data.id}`,
      })
      logger.info(`Published integration.tour.updated.v1 EDA event for new tour: ${tour.id}`)
    } catch (edaError) {
      logger.warn(`Failed to publish tour.updated EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
    }

    return
  }

  const updatedTour = await tourModule.updateTours([{
    id: matchedTour.id,
    destination: event.data.data.destination,
    duration_days: event.data.data.duration_days,
  }])

  logger.info(`[integration.tour.updated.v1] Tour updated: ${matchedTour.id}`)

  try {
    const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
    const tour = updatedTour[0] ?? updatedTour
    await eventModuleService.publishEvent({
      type: "integration",
      aggregateType: "tour",
      action: "updated",
      version: 1,
      payload: {
        id: tour.id,
        productId: tour.product_id,
        slug: tour.slug,
        destination: tour.destination,
        durationDays: tour.duration_days,
        difficulty: event.data.data.difficulty,
      },
      causationId: `medusa:tour.updated:${event.data.id}`,
    })
    logger.info(`Published integration.tour.updated.v1 EDA event for tour: ${tour.id}`)
  } catch (edaError) {
    logger.warn(`Failed to publish tour.updated EDA event: ${edaError instanceof Error ? edaError.message : String(edaError)}`)
  }
}

export const config: SubscriberConfig = {
  event: "integration.tour.updated.v1",
}
