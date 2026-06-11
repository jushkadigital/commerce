import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import createTourWorkflow from "../workflows/create-tour"
import { buildTourCreateInput, type TourSyncEventData } from "../utils/tour-sync-event"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

function serializeError(err: unknown): string {
  if (err instanceof Error) return `${err.message}\n${err.stack?.split("\n").slice(0, 8).join("\n") ?? ""}`
  if (typeof err === "object" && err !== null) {
    try { return JSON.stringify(err, Object.getOwnPropertyNames(err)).substring(0, 3000) } catch { /* fallthrough */ }
  }
  return String(err)
}

export default async function handleToursCreatedSync({
  event,
  container
}: SubscriberArgs<TourSyncEventData>) {

  const logger = container.resolve("logger")

  logger.info(`[integration.tour.published.v1] Event received: id=${event.data.id} slug=${event.data.slug} destination=${event.data.data?.destination}`)

  let workflowInput
  try {
    workflowInput = buildTourCreateInput(event.data)
    logger.info(`[integration.tour.published.v1] Workflow input built for id=${event.data.id}`)
  } catch (inputError) {
    logger.error(`[integration.tour.published.v1] Failed to build workflow input for id=${event.data.id}: ${serializeError(inputError)}`)
    throw inputError
  }

  let tourResult: { tour: any } | undefined

  try {
    const { result } = await createTourWorkflow(container).run({
      input: workflowInput
    })

    tourResult = result
    logger.info(`[integration.tour.published.v1] Tour created: tour=${result.tour.id} product=${result.tour.product_id}`)
  } catch (workflowError) {
    logger.error(`[integration.tour.published.v1] Workflow failed for id=${event.data.id}: ${serializeError(workflowError)}`)
    throw workflowError
  }

  if (!tourResult) return

  try {
    const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
    const tour = tourResult.tour
    await eventModuleService.publishEvent({
      type: "integration",
      aggregateType: "tour",
      action: "published",
      version: 1,
      payload: {
        id: tour.id,
        productId: tour.product_id,
        slug: tour.slug,
        destination: tour.destination,
        durationDays: tour.duration_days,
        difficulty: event.data.data?.difficulty,
      },
      causationId: `medusa:tour.published:${event.data.id}`,
    })
    logger.info(`Published integration.tour.published.v1 EDA event for tour: ${tour.id}`)
  } catch (edaError) {
    logger.warn(`Failed to publish tour.published EDA event: ${serializeError(edaError)}`)
  }
}

export const config: SubscriberConfig = {
  event: "integration.tour.published.v1",
}
