import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { provisionCustomerFromKeycloak } from "../workflows/helpers/provision-customer-from-keycloak"
import { EVENTS_MODULE } from "../modules/events"

type ReceiveData = {
  sub: string
  email: string
  userType: "PASSENGER" | "ADMIN"
  role?: string
  clientRoles?: string[]
}

const CONSUMER_ID = "passenger-subscriber"
const STALE_LOCK_MINUTES = 5

export default async function handlePassengerUserCreated({
  event,
  container
}: SubscriberArgs<ReceiveData>) {
  const logger = container.resolve("logger")
  const { sub, email, userType } = event.data

  const eventId = `identity.user.created.v1:passenger:${sub}`

  logger.info(`[identity.user.created.v1:passenger] Event received: sub=${sub} email=${email} userType=${userType}`)

  if (userType !== "PASSENGER") {
    logger.info(`[identity.user.created.v1:passenger] Ignoring userType=${userType} — only PASSENGER is handled by this subscriber`)
    return
  }

  if (!email) {
    logger.error("[identity.user.created.v1:passenger] Missing email — cannot provision customer")
    return
  }

  const eventsModule = container.resolve(EVENTS_MODULE)
  const idempotencyStore = eventsModule.getIdempotencyStore()

  const claimed = await idempotencyStore.claim(eventId, CONSUMER_ID, STALE_LOCK_MINUTES)

  if (!claimed) {
    const processed = await idempotencyStore.isProcessed(eventId, CONSUMER_ID)
    if (processed) {
      logger.info(`[identity.user.created.v1:passenger] Event ${eventId} already processed, skipping`)
      return
    }
    throw new Error(
      `Event ${eventId} is already claimed by another consumer instance`
    )
  }

  try {
    const result = await provisionCustomerFromKeycloak({
      container,
      keycloakSub: sub,
      keycloakEmail: email,
      extraMetadata: { synced_from_identity: true },
    })

    logger.info(
      `[identity.user.created.v1:passenger] JIT provisioning completed: customer=${result.customerId} auth=${result.authIdentityId} created=${result.wasCreated}`
    )

    await idempotencyStore.complete(eventId, CONSUMER_ID)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[identity.user.created.v1:passenger] Failed for sub=${sub}: ${message}`)
    await idempotencyStore.fail(eventId, CONSUMER_ID, message)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "identity.user.created.v1",
}
