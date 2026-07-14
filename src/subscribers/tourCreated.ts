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


  let workflowInput
  try {
    workflowInput = buildTourCreateInput(event.data)
  } catch (inputError) {
    throw inputError
  }

  let tourResult: { tour: any } | undefined

  try {
    const { result } = await createTourWorkflow(container).run({
      input: workflowInput
    })

    tourResult = result
  } catch (workflowError) {
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
        price: event.data.data?.price ?? 0,
        difficulty: event.data.data.difficulty,
      },
      causationId: `medusa:tour.published:${event.data.id}`,
    })
  } catch (edaError) {
  }
}

export const config: SubscriberConfig = {
  event: "integration.tour.published.v1",
}