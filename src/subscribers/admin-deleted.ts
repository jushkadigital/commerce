import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { EVENTS_MODULE, EventModuleService } from "../modules/events"

type ReceiveData = {
  sub: string
  email: string
  userType: "PASSENGER" | "ADMIN"
}

const CONSUMER_ID = "admin-deleted-subscriber"
const STALE_LOCK_MINUTES = 5

export default async function handleAdminUserDeleted({
  event,
  container
}: SubscriberArgs<ReceiveData>) {
  const logger = container.resolve("logger")
  const { sub, email, userType } = event.data

  const eventId = `identity.user.deleted.v1:admin:${sub}`

  logger.info(`[identity.user.deleted.v1:admin] Event received: sub=${sub} email=${email} userType=${userType}`)

  if (userType !== "ADMIN") {
    return
  }

  const eventsModule = container.resolve(EVENTS_MODULE) as EventModuleService
  const idempotencyStore = eventsModule.getIdempotencyStore()

  const claimed = await idempotencyStore.claim(eventId, CONSUMER_ID, STALE_LOCK_MINUTES)

  if (!claimed) {
    const processed = await idempotencyStore.isProcessed(eventId, CONSUMER_ID)
    if (processed) {
      logger.info(`[identity.user.deleted.v1:admin] Event ${eventId} already processed, skipping`)
      return
    }
    throw new Error(
      `Event ${eventId} is already claimed by another consumer instance`
    )
  }

  try {
    const authModule = container.resolve(Modules.AUTH)
    const userModule = container.resolve(Modules.USER)

    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "keycloak-admin",
      entity_id: email,
    })

    if (providerIdentity?.auth_identity_id) {
      await authModule.deleteAuthIdentities([providerIdentity.auth_identity_id])
      logger.info(`[identity.user.deleted.v1:admin] AuthIdentity deleted: ${providerIdentity.auth_identity_id}`)
    }

    const [user] = await userModule.listUsers({ email })

    if (user) {
      const metadata = (user.metadata as Record<string, unknown> | undefined) ?? {}
      await userModule.updateUsers({
        id: user.id,
        metadata: { ...metadata, deleted_from_identity: true, deleted_at: new Date().toISOString() },
      })
      logger.info(`[identity.user.deleted.v1:admin] Admin user soft-deleted: ${user.id}`)
    } else {
      logger.info(`[identity.user.deleted.v1:admin] No admin user found for email=${email}`)
    }

    await idempotencyStore.complete(eventId, CONSUMER_ID)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[identity.user.deleted.v1:admin] Failed for sub=${sub}: ${message}`)
    await idempotencyStore.fail(eventId, CONSUMER_ID, message)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "identity.user.deleted.v1",
}
