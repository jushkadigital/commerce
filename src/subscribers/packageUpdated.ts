import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import createPackageWorkflow from "../workflows/create-package"
import { buildPackageCreateInput, type PackageSyncEventData } from "../utils/package-sync-event"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

export default async function handlePackageUpdatedSync({
  event,
  container
}: SubscriberArgs<PackageSyncEventData>) {

  const packageModule = container.resolve<PackageModuleService>(PACKAGE_MODULE)

  const [matchedPackage] = await packageModule.getPackageByMetadata(`${event.data.id}package`)

  if (!matchedPackage) {

    const { result } = await createPackageWorkflow(container).run({
      input: buildPackageCreateInput(event.data)
    })

    try {
      const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
      const pkg = result.package
      await eventModuleService.publishEvent({
        type: "integration",
        aggregateType: "package",
        action: "updated",
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
        causationId: `medusa:package.updated:${event.data.id}`,
      })
    } catch (edaError) {
    }

    return
  }

  const updatedPackage = await packageModule.updatePackages([{
    id: matchedPackage.id,
    destination: event.data.data.destination,
    duration_days: event.data.data.duration_days,
  }])

  try {
    const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
    const pkg = Array.isArray(updatedPackage) ? updatedPackage[0] : updatedPackage
    await eventModuleService.publishEvent({
      type: "integration",
      aggregateType: "package",
      action: "updated",
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
      causationId: `medusa:package.updated:${event.data.id}`,
    })
  } catch (edaError) {
  }
}

export const config: SubscriberConfig = {
  event: "integration.package.updated.v1",
}