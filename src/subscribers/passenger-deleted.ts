import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { EVENTS_MODULE } from "../modules/events"

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
  const logger = container.resolve("logger")
  const { sub, email, userType } = event.data

  const eventId = `identity.user.deleted.v1:passenger:${sub}`

  logger.info(`[identity.user.deleted.v1:passenger] Event received: sub=${sub} email=${email} userType=${userType}`)

  if (userType !== "PASSENGER") {
    return
  }

  const eventsModule = container.resolve(EVENTS_MODULE)
  const idempotencyStore = eventsModule.getIdempotencyStore()

  const claimed = await idempotencyStore.claim(eventId, CONSUMER_ID, STALE_LOCK_MINUTES)

  if (!claimed) {
    const processed = await idempotencyStore.isProcessed(eventId, CONSUMER_ID)
    if (processed) {
      logger.info(`[identity.user.deleted.v1:passenger] Event ${eventId} already processed, skipping`)
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
      logger.info(`[identity.user.deleted.v1:passenger] AuthIdentity deleted: ${providerIdentity.auth_identity_id}`)
    }

    const [customer] = await customerModule.listCustomers({ email })

    if (customer) {
      const metadata = (customer.metadata as Record<string, unknown> | undefined) ?? {}
      await customerModule.updateCustomers(customer.id, {
        metadata: { ...metadata, deleted_from_identity: true, deleted_at: new Date().toISOString() },
      })
      logger.info(`[identity.user.deleted.v1:passenger] Customer soft-deleted: ${customer.id}`)
    } else {
      logger.info(`[identity.user.deleted.v1:passenger] No customer found for email=${email}`)
    }

    await idempotencyStore.complete(eventId, CONSUMER_ID)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[identity.user.deleted.v1:passenger] Failed for sub=${sub}: ${message}`)
    await idempotencyStore.fail(eventId, CONSUMER_ID, message)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "identity.user.deleted.v1",
}
