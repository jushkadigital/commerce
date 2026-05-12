import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import createPackageWorkflow from "../workflows/create-package"
import { extractText } from "../utils/parserRichText"
import { buildPackageCreateInput, type PackageSyncEventData } from "../utils/package-sync-event"

export default async function handlePackagesUpdatedSync({
  event,
  container
}: SubscriberArgs<PackageSyncEventData>) {

  const logger = container.resolve("logger")

  const packageModule = container.resolve<PackageModuleService>(PACKAGE_MODULE)

  logger.info(`${JSON.stringify(event.data)} `)
  const [matchedPackage] = await packageModule.getPackageByMetadata(`${event.data.id}package`)

  if (!matchedPackage) {
    const { result } = await createPackageWorkflow(container).run({
      input: buildPackageCreateInput(event.data)
    })

    logger.info(`${JSON.stringify(result)} `)
    return
  }

  const updatedPackage = await packageModule.updatePackages([{
    id: matchedPackage.id,
    destination: event.data.data.destination,
    description: extractText(event.data.data.description.root),
    duration_days: event.data.data.duration_days,
    max_capacity: event.data.data.max_capacity,
    thumbnail: event.data.data.thumbnail,

  }])


  logger.info(`${JSON.stringify(updatedPackage)} `)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "package.updated",
}
