import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { EVENTS_MODULE, EventModuleService } from "../modules/events"

type ReceiveData = {
  sub: string
  email: string
  userType: "PASSENGER" | "ADMIN"
}

const CONSUMER_ID = "passenger-deleted-subscriber"
const STALE_LOCK_MINUTES = 5

export default async function handlePassengerUserDeleted({
  event,
  container
}: SubscriberArgs<ReceiveData>) {
  const { sub, email, userType } = event.data

  const eventId = `identity.user.deleted.v1:passenger:${sub}`

  if (userType !== "PASSENGER") {
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
    const authModule = container.resolve(Modules.AUTH)
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "keycloak-store",
      entity_id: sub,
    })

    if (providerIdentity?.auth_identity_id) {
      await authModule.deleteAuthIdentities([providerIdentity.auth_identity_id])
    }

    const [customer] = await customerModule.listCustomers({ email })

    if (customer) {
      const metadata = (customer.metadata as Record<string, unknown> | undefined) ?? {}
      await customerModule.updateCustomers(customer.id, {
        metadata: { ...metadata, deleted_from_identity: true, deleted_at: new Date().toISOString() },
      })
    }

    await idempotencyStore.complete(eventId, CONSUMER_ID)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await idempotencyStore.fail(eventId, CONSUMER_ID, message)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "identity.user.deleted.v1",
}