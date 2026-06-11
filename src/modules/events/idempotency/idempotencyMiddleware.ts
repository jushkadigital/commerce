import type { EventEnvelope } from "../envelope"
import type { IdempotencyStore } from "./IdempotencyStore"

export function withIdempotency<T>(
  handler: (envelope: EventEnvelope, rawMessage: unknown) => Promise<T>,
  store: IdempotencyStore,
  consumerId: string,
  options?: { staleLockMinutes?: number }
): (envelope: EventEnvelope, rawMessage: unknown) => Promise<T | undefined> {
  const staleLockMinutes = options?.staleLockMinutes ?? 5

  return async (
    envelope: EventEnvelope,
    rawMessage: unknown
  ): Promise<T | undefined> => {
    const claimed = await store.claim(
      envelope.id,
      consumerId,
      staleLockMinutes
    )

    if (claimed) {
      try {
        const result = await handler(envelope, rawMessage)
        await store.complete(envelope.id, consumerId)
        return result
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        await store.fail(envelope.id, consumerId, errorMessage)
        throw error
      }
    }

    const processed = await store.isProcessed(envelope.id, consumerId)
    if (processed) {
      return undefined
    }

    throw new Error(
      `Event ${envelope.id} is already claimed by another consumer instance (consumer: ${consumerId})`
    )
  }
}
