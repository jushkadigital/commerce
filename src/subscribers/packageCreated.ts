import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import createPackageWorkflow from "../workflows/create-package"
import { buildPackageCreateInput, type PackageSyncEventData } from "../utils/package-sync-event"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

export default async function handlePackagePublishedSync({
  event,
  container
}: SubscriberArgs<PackageSyncEventData>) {


  const { result } = await createPackageWorkflow(container).run({
    input: buildPackageCreateInput(event.data)
  })

  try {
    const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
    const pkg = result.package
    await eventModuleService.publishEvent({
      type: "integration",
      aggregateType: "package",
      action: "published",
      version: 1,
      payload: {
        id: pkg.id,
        productId: pkg.product_id,
        slug: pkg.slug,
        destination: pkg.destination,
        durationDays: pkg.duration_days,
        price: event.data.data?.price ?? 0,
        difficulty: event.data.data.difficulty,
      },
      causationId: `medusa:package.published:${event.data.id}`,
    })
  }
  catch (edaError) {
  }
}

export const config: SubscriberConfig = {
  event: "integration.package.published.v1",
}