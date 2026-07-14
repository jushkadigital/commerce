import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { provisionCustomerFromKeycloak } from "../workflows/helpers/provision-customer-from-keycloak"
import { EVENTS_MODULE, EventModuleService } from "../modules/events"

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
  const { sub, email, userType } = event.data

  const eventId = `identity.user.created.v1:passenger:${sub}`

  if (userType !== "PASSENGER") {
    return
  }

  if (!email) {
    return
  }

  const eventsModule = container.resolve(EVENTS_MODULE) as EventModuleService
  const idempotencyStore = eventsModule.getIdempotencyStore()

  const claimed = await idempotencyStore.claim(eventId, CONSUMER_ID, STALE_LOCK_MINUTES)

  if (!claimed) {
    const processed = await idempotencyStore.isProcessed(eventId, CONSUMER_ID)
    if (processed) {
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

    await idempotencyStore.complete(eventId, CONSUMER_ID)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await idempotencyStore.fail(eventId, CONSUMER_ID, message)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "identity.user.created.v1",
}