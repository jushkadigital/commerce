import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
// CAMBIO IMPORTANTE: Importamos el workflow de CLIENTES, no de usuarios admin
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"
import createTourWorkflow from "../workflows/create-tour"
import createPackageWorkflow from "../workflows/create-package"

import { extractText } from "../utils/parserRichText"
// La data que esperas recibir de RabbitMQ (Ajusta si la estructura cambia para clientes)
type RecieveData = {
  externalId: string
  email: string
  firstName: string // Asumo que mandas nombres
  lastName: string
  eventId: string
  ocurredOn: string
}

export default async function handlePackagesCreatedSync({
  event,
  container
}: SubscriberArgs<any>) {

  const logger = container.resolve("logger")

  // CAMBIO 3: Ejecutamos el Workflow de Cuenta de Cliente
  // Este workflow crea el customer y automáticamente maneja ciertos enlaces
  /**
const gaga = await createTourWorkflow(container).run({
  input:
})
**/

  logger.info(`${JSON.stringify(event.data)} `)

  const { result } = await createPackageWorkflow(container).run({
    input: {
      destination: event.data.data.destination,
      description: extractText(event.data.data.description.root),
      duration_days: event.data.data.duration_days,
      max_capacity: event.data.data.max_capacity,
      thumbnail: event.data.data.thumbnail,
      metadata: {
        payloadId: event.data.id + "package"
      },
      prices: {
        ...(event.data.data.price ? { adult: event.data.data.price } : { adult: 0 }),
        child: 0,
        infant: 0,
        currency_code: "pen",
      },
    }
  })

  logger.info(`${JSON.stringify(result)} `)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "package.created",
}
