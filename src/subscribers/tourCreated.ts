import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import createTourWorkflow from "../workflows/create-tour"
import { buildTourCreateInput, type TourSyncEventData } from "../utils/tour-sync-event"

export default async function handleToursCreatedSync({
  event,
  container
}: SubscriberArgs<TourSyncEventData>) {

  const logger = container.resolve("logger")

  logger.info(`${JSON.stringify(event.data)} `)

  const { result } = await createTourWorkflow(container).run({
    input: buildTourCreateInput(event.data)
  })

  logger.info(`${JSON.stringify(result)} `)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "tour.created",
}
