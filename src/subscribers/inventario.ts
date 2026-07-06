import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { provisionAdminFromKeycloak } from "../workflows/helpers/provision-admin-from-keycloak"
import { EVENTS_MODULE, EventModuleService } from "../modules/events"

type ReceiveData = {
  sub: string
  email: string
  userType: "PASSENGER" | "ADMIN"
  role?: string
  clientRoles?: string[]
}

const CONSUMER_ID = "admin-subscriber"
const STALE_LOCK_MINUTES = 5

export default async function handleAdminUserCreated({
  event,
  container
}: SubscriberArgs<ReceiveData>) {
  const logger = container.resolve("logger")
  const { sub, email, userType, role, clientRoles } = event.data

  const effectiveRole = role ?? (Array.isArray(clientRoles) && clientRoles.length > 0 ? clientRoles[0] : undefined)

  const eventId = `identity.user.created.v1:${sub}`

  logger.info(`[identity.user.created.v1] Event received: sub=${sub} email=${email} userType=${userType} role=${effectiveRole ?? "none"}`)

  if (userType !== "ADMIN") {
    logger.info(`[identity.user.created.v1] Ignoring userType=${userType} — only ADMIN is handled by this subscriber`)
    return
  }

  if (!email) {
    logger.error("[identity.user.created.v1] Missing email — cannot provision user")
    return
  }

  const eventsModule = container.resolve(EVENTS_MODULE) as EventModuleService
  const idempotencyStore = eventsModule.getIdempotencyStore()

  const claimed = await idempotencyStore.claim(eventId, CONSUMER_ID, STALE_LOCK_MINUTES)

  if (!claimed) {
    const processed = await idempotencyStore.isProcessed(eventId, CONSUMER_ID)
    if (processed) {
      logger.info(`[identity.user.created.v1] Event ${eventId} already processed, skipping`)
      return
    }
    throw new Error(
      `Event ${eventId} is already claimed by another consumer instance`
    )
  }

  try {
    const result = await provisionAdminFromKeycloak({
      container,
      keycloakSub: sub,
      keycloakEmail: email,
      role: effectiveRole,
      extraMetadata: { synced_from_identity: true },
    })

    logger.info(
      `[identity.user.created.v1] Sync completed: user=${result.userId} auth=${result.authIdentityId} created=${result.wasCreated} role=${effectiveRole ?? "none"}`
    )

    await idempotencyStore.complete(eventId, CONSUMER_ID)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[identity.user.created.v1] Failed for sub=${sub}: ${message}`)
    await idempotencyStore.fail(eventId, CONSUMER_ID, message)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "identity.user.created.v1",
}
