import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import createPackageWorkflow from "../workflows/create-package"
import { buildPackageCreateInput, type PackageSyncEventData } from "../utils/package-sync-event"

export default async function handlePackagesCreatedSync({
  event,
  container
}: SubscriberArgs<PackageSyncEventData>) {

  const logger = container.resolve("logger")

  logger.info(`${JSON.stringify(event.data)} `)

  const { result } = await createPackageWorkflow(container).run({
    input: buildPackageCreateInput(event.data)
  })

  logger.info(`${JSON.stringify(result)} `)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "package.created",
}
