import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import amqp from "amqplib"
import { TOUR_MODULE } from "../../src/modules/tour"
import type TourModuleService from "../../src/modules/tour/service"

// ─── Read RabbitMQ URL from temp file (written by global setup) ───────────────
const RABBITMQ_URL = fs.readFileSync("/tmp/rabbitmq-test-url.txt", "utf-8").trim()

jest.setTimeout(900_000)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForExchange(
  channel: amqp.Channel,
  exchange: string,
  maxAttempts = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await channel.checkExchange(exchange)
      return
    } catch {
      await sleep(1_000)
    }
  }
  throw new Error(`Exchange "${exchange}" not available after ${maxAttempts}s`)
}

// Poll until `fn()` returns truthy, or throw after timeoutMs.
async function waitFor(
  fn: () => Promise<boolean> | boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 60_000
  const intervalMs = options.intervalMs ?? 1_000
  for (let elapsed = 0; elapsed < timeoutMs; elapsed += intervalMs) {
    if (await fn()) return
    await sleep(intervalMs)
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`)
}

// Build a valid CMS "TourData" payload (matches TourPublishedV1Schema / TourUpdatedV1Schema)
function buildTourData(overrides: { destination: string; duration_days: number; price?: number }) {
  return {
    destination: overrides.destination,
    description: {
      root: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Tour de prueba via testcontainers" }],
          },
        ],
      },
    },
    duration_days: overrides.duration_days,
    max_capacity: 20,
    thumbnail: "https://example.com/test-tour.jpg",
    price: overrides.price ?? 150,
    categories: [{ name: "Adventure" }],
    destinos: { name: "Cusco" },
    difficulty: "medium",
  }
}

// Publish a CMS tour event to the tourism.integration exchange (simulating PayloadCMS).
// NOTE: x-source is "cms" and x-origin-service is NOT set, so the event bus treats it as an
// external message and bridges it to medusa.events (which fires the Medusa subscriber).
function publishCmsTourEvent(
  channel: amqp.Channel,
  action: "published" | "updated" | "deleted",
  body: Record<string, unknown>
): void {
  channel.publish(
    "tourism.integration",
    `integration.tour.${action}.v1`,
    Buffer.from(JSON.stringify(body)),
    {
      contentType: "application/json",
      persistent: true,
      headers: {
        "x-event-version": "1",
        "x-event-type": "integration",
        "x-aggregate-type": "tour",
        "x-action": action,
        "x-source": "cms",
      },
    }
  )
}

// Set up a consumer on the medusa.events exchange for a given routing key.
// Returns the array where messages are collected.
async function consumeMedusaEvents(
  channel: amqp.Channel,
  routingKey: string
): Promise<{ messages: any[] }> {
  const messages: any[] = []
  const { queue } = await channel.assertQueue("", { exclusive: true })
  await channel.bindQueue(queue, "medusa.events", routingKey)
  await channel.consume(queue, (msg: amqp.ConsumeMessage | null) => {
    if (msg) {
      messages.push(JSON.parse(msg.content.toString()))
      channel.ack(msg)
    }
  })
  return { messages }
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    RABBITMQ_URL,
    TEST_RABBITMQ: "true",
  },
  testSuite: ({ getContainer }) => {
    describe("Tour lifecycle events received via RabbitMQ (testcontainers)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let query: any
      let amqpConnection: any
      let amqpChannel: amqp.Channel

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        query = container.resolve(ContainerRegistrationKeys.QUERY)

        // Connect to RabbitMQ for test operations (publish CMS event, consume bridge events)
        amqpConnection = await amqp.connect(RABBITMQ_URL)
        amqpChannel = await amqpConnection.createChannel()

        // Wait for the app to finish booting (startApp → loaders runs after appLoader.load).
        // The event-bus-rabbitmq module declares the medusa.events exchange during startApp.
        // We use assertExchange (idempotent) to ensure it exists before tests bind to it.
        await sleep(5_000)
        try {
          await amqpChannel.assertExchange("medusa.events", "topic", { durable: true })
        } catch {
          // Exchange may already exist with same type (no-op) or app hasn't declared it yet
          // — retry after a short delay
          await sleep(3_000)
          await amqpChannel.assertExchange("medusa.events", "topic", { durable: true })
        }
      })

      afterAll(async () => {
        await amqpChannel?.close()
        await amqpConnection?.close()
      })

      // ─── 1. published.v1 → create tour + emit product.created ───────────────

      it("should receive integration.tour.published.v1, create a tour, and emit product.created", async () => {
        const id = Date.now()
        const slug = `lifecycle-created-${id}`
        const payloadId = `${id}tour`

        // ── Set up consumer for product.created BEFORE publishing ──────────────
        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")

        // ── Publish CMS event (published == "created from CMS") ──────────────────
        publishCmsTourEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildTourData({ destination: "Machu Picchu Created", duration_days: 3 }),
        })

        // ── Wait for the tour to be created (subscriber received + processed) ─────
        let createdTour: any = null
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          if (tours.length > 0) {
            createdTour = tours[0]
            return true
          }
          return false
        })

        expect(createdTour).not.toBeNull()
        expect(createdTour.destination).toBe("Machu Picchu Created")
        expect(createdTour.duration_days).toBe(3)
        // The create-tour workflow generates the slug from destination+duration
        // (generateSlugStep), so it is not the CMS-provided slug — just assert it exists.
        expect(createdTour.slug).toBeTruthy()

        // ── Wait for product.created event on medusa.events exchange ─────────────
        await waitFor(() => productCreated.messages.length > 0, { timeoutMs: 30_000 })

        const productEvent = productCreated.messages[0]
        expect(productEvent.name).toBe("product.created")

        // ── Product exists in DB with external_id ─────────────────────────────────
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "title", "external_id", "status"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(1)
        expect(products[0].external_id).toBe(payloadId)
      })

      // ─── 2. updated.v1 → update tour ───────────────────────────────────────

      it("should receive integration.tour.updated.v1 and update the tour", async () => {
        const id = Date.now()
        const slug = `lifecycle-updated-${id}`
        const payloadId = `${id}tour`

        // ── Pre-create the tour via published.v1 (so the update branch runs) ──────
        publishCmsTourEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildTourData({ destination: "Original City", duration_days: 3 }),
        })
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          return tours.length > 0
        })

        // ── Publish CMS update event with changed destination & duration_days ──────
        publishCmsTourEvent(amqpChannel, "updated", {
          id,
          slug,
          data: buildTourData({ destination: "Updated City", duration_days: 7 }),
        })

        // ── Wait for the tour fields to change (subscriber received + processed) ──
        let updatedTour: any = null
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          if (!tours.length) return false
          const t = tours[0]
          if (t.destination === "Updated City" && t.duration_days === 7) {
            updatedTour = t
            return true
          }
          return false
        })

        expect(updatedTour.destination).toBe("Updated City")
        expect(updatedTour.duration_days).toBe(7)
      })

      // ─── 3. deleted.v1 → delete tour + product ─────────────────────────────

      it("should receive integration.tour.deleted.v1 and delete the tour", async () => {
        const id = Date.now()
        const slug = `lifecycle-deleted-${id}`
        const payloadId = `${id}tour`

        // ── Pre-create the tour via published.v1 (so there is a tour to delete) ───
        publishCmsTourEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildTourData({ destination: "ToDelete City", duration_days: 2 }),
        })
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          return tours.length > 0
        })

        // ── Publish CMS delete event (payload only needs the id) ───────────────────
        publishCmsTourEvent(amqpChannel, "deleted", { id })

        // ── Wait for the tour to be gone (subscriber received + processed) ─────────
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          return tours.length === 0
        })

        // ── Wait for the linked product to be deleted too (subscriber does this) ──
        await waitFor(
          async () => {
            const { data: products } = await query.graph({
              entity: "product",
              fields: ["id"],
              filters: { external_id: payloadId },
            })
            return products.length === 0
          },
          { timeoutMs: 30_000 }
        )

        // ── Assertions: tour and product removed ──────────────────────────────────
        expect((await tourModuleService.getTourByMetadata(payloadId)).length).toBe(0)

        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "external_id"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(0)
      })

      // ─── 4. Batch: 3 different events simultaneously ────────────────────────

      it("should receive 3 tour.published events in batch without duplicate errors", async () => {
        const baseId = Date.now()
        const ids = [baseId, baseId + 1, baseId + 2]
        const payloadIds = ids.map((id) => `${id}tour`)

        // ── Set up consumer for product.created (should receive 3 messages) ───────
        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")

        // ── Publish 3 different tour events simultaneously ─────────────────────────
        ids.forEach((id, i) => {
          publishCmsTourEvent(amqpChannel, "published", {
            id,
            slug: `batch-tour-${id}`,
            data: buildTourData({
              destination: `Batch City ${i + 1}`,
              duration_days: i + 2,
            }),
          })
        })

        // ── Wait for all 3 tours to be created ─────────────────────────────────────
        await waitFor(async () => {
          for (const pid of payloadIds) {
            const tours = await tourModuleService.getTourByMetadata(pid)
            if (tours.length === 0) return false
          }
          return true
        }, { timeoutMs: 120_000 })

        // ── Assertions: all 3 tours created with correct data ──────────────────────
        for (let i = 0; i < 3; i++) {
          const tours = await tourModuleService.getTourByMetadata(payloadIds[i])
          expect(tours.length).toBe(1)
          expect(tours[0].destination).toBe(`Batch City ${i + 1}`)
          expect(tours[0].duration_days).toBe(i + 2)
        }

        // ── All 3 products created (no duplicate errors) ───────────────────────────
        await waitFor(async () => productCreated.messages.length >= 3, { timeoutMs: 30_000 })
        expect(productCreated.messages.length).toBeGreaterThanOrEqual(3)

        for (let i = 0; i < 3; i++) {
          const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "external_id"],
            filters: { external_id: payloadIds[i] },
          })
          expect(products.length).toBe(1)
          expect(products[0].external_id).toBe(payloadIds[i])
        }
      })

      // ─── 5. Idempotency: same event 3 times → only 1 tour ────────────────────

      it("should handle duplicate tour.published events without creating duplicates", async () => {
        const id = Date.now()
        const slug = `idempotent-tour-${id}`
        const payloadId = `${id}tour`

        // ── Publish the SAME event 3 times in quick succession ────────────────────
        for (let i = 0; i < 3; i++) {
          publishCmsTourEvent(amqpChannel, "published", {
            id,
            slug,
            data: buildTourData({ destination: "Idempotent City", duration_days: 5 }),
          })
          // Delay between publishes to allow the subscriber to process each — the
          // idempotency check needs the first tour to be committed before the 2nd event arrives
          if (i < 2) await sleep(3000)
        }

        // ── Wait for the tour to be created ─────────────────────────────────────────
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          return tours.length > 0
        })

        // ── Give extra time for any duplicate processing to settle ──────────────────
        await sleep(5_000)

        // ── Assertions: exactly 1 tour (idempotency worked) ──────────────────────────
        const tours = await tourModuleService.getTourByMetadata(payloadId)
        expect(tours.length).toBe(1)
        expect(tours[0].destination).toBe("Idempotent City")
        expect(tours[0].duration_days).toBe(5)

        // ── Exactly 1 product (no duplicates) ─────────────────────────────────────────
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "external_id"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(1)
      })

      // ─── 6. Same destination+duration, concurrent events → no handle collision ─

      it("should create two tours with same destination+duration concurrently without handle collision", async () => {
        const id1 = Date.now()
        const id2 = id1 + 1
        const payloadId1 = `${id1}tour`
        const payloadId2 = `${id2}tour`

        // ── Publish BOTH events simultaneously (reproduces the production race condition)
        // In production, two events with the same destination+duration arrived within 2
        // seconds and both passed findUniqueSlug before either product was committed.
        publishCmsTourEvent(amqpChannel, "published", {
          id: id1,
          slug: `same-dest-tour-${id1}`,
          data: buildTourData({ destination: "Same Destination", duration_days: 3 }),
        })
        publishCmsTourEvent(amqpChannel, "published", {
          id: id2,
          slug: `same-dest-tour-${id2}`,
          data: buildTourData({ destination: "Same Destination", duration_days: 3 }),
        })

        // ── Wait for BOTH tours to be created (this used to crash with race condition) ─
        await waitFor(async () => {
          const t1 = await tourModuleService.getTourByMetadata(payloadId1)
          const t2 = await tourModuleService.getTourByMetadata(payloadId2)
          return t1.length > 0 && t2.length > 0
        }, { timeoutMs: 60_000 })

        // ── Assertions: both tours created ──────────────────────────────────────────
        const tours1 = await tourModuleService.getTourByMetadata(payloadId1)
        const tours2 = await tourModuleService.getTourByMetadata(payloadId2)
        expect(tours1.length).toBe(1)
        expect(tours2.length).toBe(1)
        expect(tours1[0].destination).toBe("Same Destination")
        expect(tours2[0].destination).toBe("Same Destination")

        // ── Both products exist with different handles (no collision) ───────────────
        const { data: products1 } = await query.graph({
          entity: "product",
          fields: ["id", "external_id", "handle"],
          filters: { external_id: payloadId1 },
        })
        const { data: products2 } = await query.graph({
          entity: "product",
          fields: ["id", "external_id", "handle"],
          filters: { external_id: payloadId2 },
        })
        expect(products1.length).toBe(1)
        expect(products2.length).toBe(1)

        // Handles must be different (each includes its unique payloadId suffix)
        expect(products1[0].handle).not.toBe(products2[0].handle)
      })

      // ─── 7. Verify all expected events are emitted to RabbitMQ ─────────────

      it("should emit product.created, entityTour.created, and notification.tour.synced to RabbitMQ", async () => {
        const id = Date.now()
        const slug = `event-verify-${id}`
        const payloadId = `${id}tour`

        // ── Set up consumers for all expected events BEFORE publishing ──────────
        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")
        const entityTourCreated = await consumeMedusaEvents(amqpChannel, "medusa.entityTour.created")

        // The notification.tour.synced event is published by the subscriber to the
        // tourism.notification exchange (not medusa.events). Bind a queue there too.
        const tourSyncedMessages: any[] = []
        const { queue: notifQueue } = await amqpChannel.assertQueue("", { exclusive: true })
        await amqpChannel.bindQueue(notifQueue, "tourism.notification", "notification.tour.synced.v1")
        await amqpChannel.consume(notifQueue, (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            tourSyncedMessages.push(JSON.parse(msg.content.toString()))
            amqpChannel.ack(msg)
          }
        })

        // ── Publish CMS event ──────────────────────────────────────────────────
        publishCmsTourEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildTourData({ destination: "Event Verify City", duration_days: 4 }),
        })

        // ── Wait for the tour to be created ─────────────────────────────────────
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          return tours.length > 0
        })

        // ── Wait for product.created on medusa.events ──────────────────────────
        await waitFor(() => productCreated.messages.length > 0, { timeoutMs: 30_000 })
        expect(productCreated.messages[0].name).toBe("product.created")

        // ── Wait for entityTour.created on medusa.events ────────────────────────
        await waitFor(() => entityTourCreated.messages.length > 0, { timeoutMs: 30_000 })
        expect(entityTourCreated.messages[0].name).toBe("entityTour.created")

        // ── Wait for notification.tour.synced on tourism.notification ───────────
        await waitFor(() => tourSyncedMessages.length > 0, { timeoutMs: 30_000 })
        const syncedEvent = tourSyncedMessages[0]
        // The notification event is a tourism-events/v1 envelope
        expect(syncedEvent.type).toBe("notification")
        expect(syncedEvent.aggregateType).toBe("tour")
        expect(syncedEvent.action).toBe("synced")
        expect(syncedEvent.payload.destination).toBe("Event Verify City")
      })
    })
  },
})
