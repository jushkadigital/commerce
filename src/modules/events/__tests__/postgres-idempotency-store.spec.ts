import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PostgresIdempotencyStore } from "../idempotency/PostgresIdempotencyStore"

jest.setTimeout(120 * 1000)

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS processed_event (
    "id" text not null,
    "event_id" text not null,
    "consumer_id" text not null,
    "status" text not null,
    "stale_lock_until" timestamptz not null,
    "payload_hash" text null,
    "processed_at" timestamptz null,
    "error_message" text null,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    "deleted_at" timestamptz null,
    constraint "processed_event_pkey" primary key ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "IDX_processed_event_event_id_consumer_id_unique"
    ON "processed_event" ("event_id", "consumer_id") WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS "IDX_processed_event_deleted_at"
    ON "processed_event" ("deleted_at") WHERE deleted_at IS NULL;
`

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    describe("PostgresIdempotencyStore", () => {
      let store: PostgresIdempotencyStore

      beforeAll(async () => {
        const container = getContainer()
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        await knex.raw(CREATE_TABLE_SQL)
        store = new PostgresIdempotencyStore(container)
      })

      beforeEach(async () => {
        const container = getContainer()
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        await knex.raw("DELETE FROM processed_event")
      })

      describe("claim", () => {
        it("returns true on first claim for a new event", async () => {
          const result = await store.claim("evt_001", "consumer_a", 5)
          expect(result).toBe(true)
        })

        it("returns false on second claim with same event_id and consumer_id", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          const result = await store.claim("evt_001", "consumer_a", 5)
          expect(result).toBe(false)
        })

        it("allows different consumers to claim the same event independently", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          const result = await store.claim("evt_001", "consumer_b", 5)
          expect(result).toBe(true)
        })

        it("allows the same consumer to claim a different event", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          const result = await store.claim("evt_002", "consumer_a", 5)
          expect(result).toBe(true)
        })

        it("returns false for event already completed", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          await store.complete("evt_001", "consumer_a")
          const result = await store.claim("evt_001", "consumer_a", 5)
          expect(result).toBe(false)
        })

        it("can reclaim after stale lock expires", async () => {
          await store.claim("evt_001", "consumer_a", 0)
          await new Promise((r) => setTimeout(r, 1100))
          const result = await store.claim("evt_001", "consumer_a", 5)
          expect(result).toBe(true)
        })
      })

      describe("isProcessed", () => {
        it("returns false for an event that was only claimed", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          const processed = await store.isProcessed("evt_001", "consumer_a")
          expect(processed).toBe(false)
        })

        it("returns false for a non-existent event", async () => {
          const processed = await store.isProcessed("nonexistent", "consumer_a")
          expect(processed).toBe(false)
        })

        it("returns true after complete", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          await store.complete("evt_001", "consumer_a")
          const processed = await store.isProcessed("evt_001", "consumer_a")
          expect(processed).toBe(true)
        })

        it("returns false for a failed event", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          await store.fail("evt_001", "consumer_a", "something went wrong")
          const processed = await store.isProcessed("evt_001", "consumer_a")
          expect(processed).toBe(false)
        })
      })

      describe("fail", () => {
        it("marks event as failed and prevents reprocessing on same claim", async () => {
          await store.claim("evt_001", "consumer_a", 5)
          await store.fail("evt_001", "consumer_a", "error")
          const result = await store.claim("evt_001", "consumer_a", 5)
          expect(result).toBe(false)
        })

        it("does not allow reprocessing after fail (only stale claimed rows can be reclaimed)", async () => {
          await store.claim("evt_001", "consumer_a", 0)
          await store.fail("evt_001", "consumer_a", "error")
          await new Promise((r) => setTimeout(r, 1100))
          const result = await store.claim("evt_001", "consumer_a", 5)
          expect(result).toBe(false)
        })
      })

      describe("releaseStaleClaims", () => {
        it("releases stale claims for a given consumer", async () => {
          await store.claim("evt_001", "consumer_a", 0)
          await new Promise((r) => setTimeout(r, 1100))
          const released = await store.releaseStaleClaims("consumer_a", 5)
          expect(released).toBe(1)
        })

        it("does not release active claims", async () => {
          await store.claim("evt_001", "consumer_a", 10)
          const released = await store.releaseStaleClaims("consumer_a", 5)
          expect(released).toBe(0)
        })

        it("only releases claims for the specified consumer", async () => {
          await store.claim("evt_001", "consumer_a", 0)
          await store.claim("evt_002", "consumer_b", 10)
          await new Promise((r) => setTimeout(r, 1100))
          const released = await store.releaseStaleClaims("consumer_a", 5)
          expect(released).toBe(1)
        })
      })

      describe("cleanup", () => {
        it("deletes processed rows older than specified days", async () => {
          const container = getContainer()
          const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          await knex.raw(`
            INSERT INTO processed_event (id, event_id, consumer_id, status, stale_lock_until, processed_at, created_at)
            VALUES ('old_001', 'evt_old', 'consumer_a', 'processed', NOW(), NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
          `)
          const deleted = await store.cleanup(7)
          expect(deleted).toBe(1)
        })

        it("does not delete recent processed rows", async () => {
          const container = getContainer()
          const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          await knex.raw(`
            INSERT INTO processed_event (id, event_id, consumer_id, status, stale_lock_until, processed_at)
            VALUES ('recent_001', 'evt_recent', 'consumer_a', 'processed', NOW(), NOW())
          `)
          const deleted = await store.cleanup(7)
          expect(deleted).toBe(0)
        })

        it("does not delete claimed rows", async () => {
          const container = getContainer()
          const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          await knex.raw(`
            INSERT INTO processed_event (id, event_id, consumer_id, status, stale_lock_until, processed_at, created_at)
            VALUES ('claimed_old', 'evt_claimed', 'consumer_a', 'claimed', NOW(), NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
          `)
          const deleted = await store.cleanup(7)
          expect(deleted).toBe(0)
        })
      })

      describe("full lifecycle - idempotent processing", () => {
        it("processes an event exactly once across duplicate claims", async () => {
          let counter = 0

          const process = async () => {
            const claimed = await store.claim("evt_001", "consumer_a", 5)
            if (!claimed) {
              const processed = await store.isProcessed("evt_001", "consumer_a")
              if (processed) return "already-done"
              throw new Error("claimed by another")
            }
            try {
              counter++
              await store.complete("evt_001", "consumer_a")
              return "done"
            } catch (error) {
              const m = error instanceof Error ? error.message : String(error)
              await store.fail("evt_001", "consumer_a", m)
              throw error
            }
          }

          const [r1, r2, r3] = await Promise.all([process(), process(), process()])
          const results = [r1, r2, r3].filter((r) => r !== undefined)
          expect(counter).toBe(1)
          expect(results.filter((r) => r === "done")).toHaveLength(1)
        })
      })
    })
  },
})
