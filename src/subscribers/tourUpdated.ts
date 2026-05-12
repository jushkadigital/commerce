import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import createTourWorkflow from "../workflows/create-tour"
import { extractText } from "../utils/parserRichText"
import { buildTourCreateInput, type TourSyncEventData } from "../utils/tour-sync-event"

export default async function handleToursUpdatedSync({
  event,
  container
}: SubscriberArgs<TourSyncEventData>) {

  const logger = container.resolve("logger")

  const tourModule = container.resolve<TourModuleService>(TOUR_MODULE)

  logger.info(`${JSON.stringify(event.data)} `)
  const [matchedTour] = await tourModule.getTourByMetadata(`${event.data.id}tour`)

  if (!matchedTour) {
    const { result } = await createTourWorkflow(container).run({
      input: buildTourCreateInput(event.data)
    })

    logger.info(`${JSON.stringify(result)} `)
    return
  }

  logger.info(`${JSON.stringify(matchedTour)} `)
  const updatedTour = await tourModule.updateTours([{
    id: matchedTour.id,
    destination: event.data.data.destination,
    description: extractText(event.data.data.description.root),
    duration_days: event.data.data.duration_days,
    max_capacity: event.data.data.max_capacity,
    thumbnail: event.data.data.thumbnail
  }])


  logger.info(`${JSON.stringify(updatedTour)} `)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "tour.updated",
}
