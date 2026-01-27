import { MedusaError, Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"

// La data que esperas recibir de RabbitMQ
type RecieveData = {
  externalId: string
  email: string
  adminType: string
  eventId: string
  ocurredOn: string
}

export default async function handleInventoryUpdate({
  event,
  container
}: SubscriberArgs<RecieveData>) {

  const logger = container.resolve("logger")
  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)


  logger.info(`[RabbitMQ] Recibido evento: ${JSON.stringify(event)}`)



  const existingUsers = await userModule.listUsers({
    email: event.data.email,
  })

  if (existingUsers.length > 0) {
    throw new MedusaError("grave", "Err")
  }

  let authIdentity
  try {
    authIdentity = await authModule.createAuthIdentities({
      provider_identities: [
        {
          provider: "keycloak-admin",
          entity_id: event.data.email,
          user_metadata: {
            email: event.data.email,
            given_name: "",
            family_name: "",
            keycloak_sub: event.data.externalId,
          },
        },
      ],
    })
  } catch (authError: any) {
    // Si ya existe, continuar sin auth identity pre-creada
    // Se vinculará cuando el usuario haga login con Keycloak
    console.warn("Could not pre-create auth identity:", authError.message)
    throw new MedusaError("grave", "Error auth step")
  }
  const { result } = await createUserAccountWorkflow(container).run({
    input: {
      userData: {
        email: event.data.email,
        first_name: "",
        last_name: "",
        metadata: {
          keycloak_sub: event.data.externalId,
          synced_from_cms: true,
          cms_metadata: {},
        },
      },
      authIdentityId: authIdentity?.id,
    },
  })
  if (authIdentity && result?.id) {
    await authModule.updateAuthIdentities([{
      id: authIdentity.id,
      app_metadata: {
        user_id: result.id // <--- ESTO ES LO QUE FALTABA
      }
    }])
    logger.info(`✅ Usuario vinculado correctamente: ${result.id} <-> ${authIdentity.id}`)
  }


  logger.info(`${JSON.stringify(result)}`)
}

export const config: SubscriberConfig = {
  // ESTA ES LA CLAVE DE ENRUTAMIENTO (ROUTING KEY)
  // Debe coincidir exactamente con lo que envía tu Quarkus/RabbitMQ
  event: "admin.registered",
}
