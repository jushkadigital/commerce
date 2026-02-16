import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
// CAMBIO IMPORTANTE: Importamos el workflow de CLIENTES, no de usuarios admin
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"
import { TOUR_MODULE } from "../modules/tour"

// La data que esperas recibir de RabbitMQ (Ajusta si la estructura cambia para clientes)
type RecieveData = {
  externalId: string
  email: string
  firstName: string // Asumo que mandas nombres
  lastName: string
  eventId: string
  ocurredOn: string
}

export default async function handleToursUpdatedSync({
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

  logger.info(` PORQUEEE `)
  const tourModule = container.resolve(TOUR_MODULE)

  logger.info(`${JSON.stringify(event.data)} `)
  const [gege] = await tourModule.getTourByMetadata(event.data.id)

  const newTour = await tourModule.updateTours([{
    id: gege.id,
    destination: event.data.changes.title,
    description: event.data.changes.meta.description,
    duration_days: event.data.changes.durationGeneral,
    max_capacity: event.data.changes.layout?.find(ele => ele.blockType == "dataTour")?.groupSize.value || 15,
    thumbnail: event.data.changes.meta.image.sizes.og.url,
  }])


  logger.info(`${JSON.stringify(gege)} `)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "tour.updated",
}
