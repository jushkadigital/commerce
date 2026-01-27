import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
// CAMBIO IMPORTANTE: Importamos el workflow de CLIENTES, no de usuarios admin
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

// La data que esperas recibir de RabbitMQ (Ajusta si la estructura cambia para clientes)
type RecieveData = {
  externalId: string
  email: string
  firstName: string // Asumo que mandas nombres
  lastName: string
  eventId: string
  ocurredOn: string
}

export default async function handleCustomerSync({
  event,
  container
}: SubscriberArgs<RecieveData>) {

  const logger = container.resolve("logger")
  // CAMBIO 1: Usamos el módulo de Customer
  const customerModule = container.resolve(Modules.CUSTOMER)
  const authModule = container.resolve(Modules.AUTH)

  logger.info(`[RabbitMQ] Recibido evento Customer: ${JSON.stringify(event)}`)

  // Verificar si ya existe el customer
  const existingCustomers = await customerModule.listCustomers({
    email: event.data.email,
  })

  if (existingCustomers.length > 0) {
    // Aquí podrías decidir si actualizas en lugar de lanzar error, 
    // pero mantenemos tu lógica de error.
    throw new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "El cliente ya existe")
  }

  let authIdentity
  try {
    authIdentity = await authModule.createAuthIdentities({
      provider_identities: [
        {
          // CAMBIO 2: Aquí va el ID de tu provider de Storefront 
          // (asegúrate que en medusa-config.js sea "keycloak" o "keycloak-store")
          provider: "keycloak-store",
          entity_id: event.data.externalId,
          user_metadata: {
            email: event.data.email,
            given_name: event.data.firstName,
            family_name: event.data.lastName,
            keycloak_sub: event.data.externalId,
          },
        },
      ],
    })
  } catch (authError: any) {
    console.warn("Could not pre-create auth identity:", authError.message)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Error auth step")
  }

  // CAMBIO 3: Ejecutamos el Workflow de Cuenta de Cliente
  // Este workflow crea el customer y automáticamente maneja ciertos enlaces
  const { result } = await createCustomerAccountWorkflow(container).run({
    input: {
      customerData: {
        email: event.data.email,
        first_name: event.data.firstName || "",
        last_name: event.data.lastName || "",
        metadata: {
          keycloak_sub: event.data.externalId,
          synced_from_mq: true,
        },
      },
      authIdentityId: authIdentity?.id,
    },
  })

  // Actualización de metadatos (opcional pero recomendada para mantener tu consistencia)
  if (authIdentity && result?.id) {
    await authModule.updateAuthIdentities([{
      id: authIdentity.id,
      app_metadata: {
        // En customers se suele usar 'customer_id', pero Medusa v2 usa 'actor_id' internamente.
        // Guardar esto aquí ayuda a depurar.
        customer_id: result.id
      }
    }])
    logger.info(`✅ Customer vinculado correctamente: ${result.id} <-> ${authIdentity.id}`)
  }

  logger.info(`Customer creado: ${JSON.stringify(result)}`)
}

export const config: SubscriberConfig = {
  // Asegúrate que esta sea la routing key correcta que envía tu Quarkus
  event: "passenger.registered",
}
