import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import type { Knex } from "@mikro-orm/knex"
import { IdempotencyStore } from "./IdempotencyStore"

export class PostgresIdempotencyStore implements IdempotencyStore {
  private readonly knex: Knex

  constructor(container: MedusaContainer) {
    this.knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  }

  async claim(
    eventId: string,
    consumerId: string,
    staleLockMinutes: number
  ): Promise<boolean> {
    const id = crypto.randomUUID()

    try {
      const insertResult = await this.knex.raw(
        `
        INSERT INTO processed_event (id, event_id, consumer_id, status, stale_lock_until, processed_at)
        VALUES (?, ?, ?, 'claimed', NOW() + ? * INTERVAL '1 minute', NOW())
        `,
        [id, eventId, consumerId, staleLockMinutes]
      )

      if (insertResult.rowCount === 1) {
        return true
      }
    } catch (error: unknown) {
      if (!this.isUniqueViolation(error)) {
        throw error
      }
    }

    const existingResult = await this.knex.raw(
      `
      SELECT status, stale_lock_until
      FROM processed_event
      WHERE event_id = ? AND consumer_id = ? AND deleted_at IS NULL
      `,
      [eventId, consumerId]
    )

    const row = existingResult.rows[0]
    if (!row) {
      return false
    }

    if (row.status === "processed") {
      return false
    }

    const staleLockUntil = new Date(row.stale_lock_until)
    if (row.status === "claimed" && staleLockUntil < new Date()) {
      const updateResult = await this.knex.raw(
        `
        UPDATE processed_event
        SET status = 'claimed',
            stale_lock_until = NOW() + ? * INTERVAL '1 minute',
            processed_at = NOW(),
            error_message = NULL
        WHERE event_id = ? AND consumer_id = ?
          AND status = 'claimed'
          AND stale_lock_until < NOW()
          AND deleted_at IS NULL
        `,
        [staleLockMinutes, eventId, consumerId]
      )

      return updateResult.rowCount === 1
    }

    return false
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false
    }
    const pgError = error as { code?: string; constraint?: string }
    return pgError.code === "23505"
  }

  async complete(eventId: string, consumerId: string): Promise<void> {
    await this.knex.raw(
      `
      UPDATE processed_event
      SET status = 'processed', processed_at = NOW()
      WHERE event_id = ? AND consumer_id = ? AND deleted_at IS NULL
      `,
      [eventId, consumerId]
    )
  }

  async fail(
    eventId: string,
    consumerId: string,
    error: string
  ): Promise<void> {
    await this.knex.raw(
      `
      UPDATE processed_event
      SET status = 'failed', error_message = ?
      WHERE event_id = ? AND consumer_id = ? AND deleted_at IS NULL
      `,
      [error, eventId, consumerId]
    )
  }

  async isProcessed(
    eventId: string,
    consumerId: string
  ): Promise<boolean> {
    const result = await this.knex.raw(
      `
      SELECT status
      FROM processed_event
      WHERE event_id = ? AND consumer_id = ? AND status = 'processed' AND deleted_at IS NULL
      `,
      [eventId, consumerId]
    )

    return result.rows.length > 0
  }

  async releaseStaleClaims(
    consumerId: string,
    staleLockMinutes: number
  ): Promise<number> {
    const result = await this.knex.raw(
      `
      UPDATE processed_event
      SET status = 'failed',
          error_message = 'Released stale claim after ' || ? || ' minutes'
      WHERE status = 'claimed'
        AND stale_lock_until < NOW()
        AND consumer_id = ?
        AND deleted_at IS NULL
      `,
      [staleLockMinutes, consumerId]
    )

    return result.rowCount ?? 0
  }

  async cleanup(olderThanDays: number): Promise<number> {
    const result = await this.knex.raw(
      `
      DELETE FROM processed_event
      WHERE processed_at < NOW() - ? * INTERVAL '1 day'
        AND status IN ('processed', 'failed')
      `,
      [olderThanDays]
    )

    return result.rowCount ?? 0
  }
}
