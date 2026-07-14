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


  const tourModule = container.resolve<TourModuleService>(TOUR_MODULE)

  const [matchedTour] = await tourModule.getTourByMetadata(`${event.data.id}tour`)

  if (!matchedTour) {

    const { result } = await createTourWorkflow(container).run({
      input: buildTourCreateInput(event.data)
    })

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
          price: event.data.data?.price ?? 0,
          difficulty: event.data.data.difficulty,
        },
        causationId: `medusa:tour.updated:${event.data.id}`,
      })
    } catch (edaError) {
    }

    return
  }

  const updatedTour = await tourModule.updateTours([{
    id: matchedTour.id,
    destination: event.data.data.destination,
    duration_days: event.data.data.duration_days,
  }])

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
        price: event.data.data?.price ?? 0,
        difficulty: event.data.data.difficulty,
      },
      causationId: `medusa:tour.updated:${event.data.id}`,
    })
  } catch (edaError) {
  }
}

export const config: SubscriberConfig = {
  event: "integration.tour.updated.v1",
}