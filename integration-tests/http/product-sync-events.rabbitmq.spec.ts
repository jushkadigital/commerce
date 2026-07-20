import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import fs from "fs"
import amqp from "amqplib"
import { TOUR_MODULE } from "../../src/modules/tour"
import { PACKAGE_MODULE } from "../../src/modules/package"
import type TourModuleService from "../../src/modules/tour/service"
import type PackageModuleService from "../../src/modules/package/service"

// ─── Read RabbitMQ URL from temp file (written by global setup) ───────────────
const RABBITMQ_URL = fs.readFileSync("/tmp/rabbitmq-test-url.txt", "utf-8").trim()

jest.setTimeout(900_000)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

// Set up a consumer on the tourism.integration exchange for a given routing key.
// Returns the array where messages are collected.
async function consumeIntegrationEvents(
  channel: amqp.Channel,
  routingKey: string
): Promise<{ messages: any[] }> {
  const messages: any[] = []
  const { queue } = await channel.assertQueue("", { exclusive: true })
  await channel.bindQueue(queue, "tourism.integration", routingKey)
  await channel.consume(queue, (msg: amqp.ConsumeMessage | null) => {
    if (msg) {
      messages.push(JSON.parse(msg.content.toString()))
      channel.ack(msg)
    }
  })
  return { messages }
}

// Build a valid CMS "PackageData" payload (matches PackagePublishedV1Schema)
function buildPackageData(overrides: { destination: string; duration_days: number; price?: number }) {
  return {
    destination: overrides.destination,
    description: {
      root: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Package de prueba via testcontainers" }],
          },
        ],
      },
    },
    duration_days: overrides.duration_days,
    max_capacity: 20,
    thumbnail: "https://example.com/test-package.jpg",
    price: overrides.price ?? 150,
    destinos: [{ name: "Cusco" }],
    difficulty: "medium",
  }
}

// Publish a CMS package event to the tourism.integration exchange (simulating PayloadCMS).
function publishCmsPackageEvent(
  channel: amqp.Channel,
  action: "published" | "updated" | "deleted",
  body: Record<string, unknown>
): void {
  channel.publish(
    "tourism.integration",
    `integration.package.${action}.v1`,
    Buffer.from(JSON.stringify(body)),
    {
      contentType: "application/json",
      persistent: true,
      headers: {
        "x-event-version": "1",
        "x-event-type": "integration",
        "x-aggregate-type": "package",
        "x-action": action,
        "x-source": "cms",
      },
    }
  )
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    RABBITMQ_URL,
    TEST_RABBITMQ: "true",
  },
  testSuite: ({ getContainer }) => {
    describe("Product sync events received via RabbitMQ (testcontainers)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let packageModuleService: PackageModuleService
      let query: any
      let amqpConnection: any
      let amqpChannel: amqp.Channel

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        packageModuleService = container.resolve(PACKAGE_MODULE)
        query = container.resolve(ContainerRegistrationKeys.QUERY)

        // Connect to RabbitMQ for test operations (publish CMS event, consume bridge events)
        amqpConnection = await amqp.connect(RABBITMQ_URL)
        amqpChannel = await amqpConnection.createChannel()

        // Wait for the app to finish booting (startApp → loaders runs after appLoader.load).
        // We use assertExchange (idempotent) to ensure the exchanges exist before tests bind to them.
        await sleep(5_000)
        try {
          await amqpChannel.assertExchange("tourism.integration", "topic", { durable: true })
        } catch {
          // Exchange may already exist with same type (no-op) or app hasn't declared it yet
          // — retry after a short delay
          await sleep(3_000)
          await amqpChannel.assertExchange("tourism.integration", "topic", { durable: true })
        }
      })

      afterAll(async () => {
        await amqpChannel?.close()
        await amqpConnection?.close()
      })

      // ─── Test 1: published.v1 → create tour + emit integration.product.synced.v1 ───

      it("should emit integration.product.synced.v1 to tourism.integration after tour created via CMS", async () => {
        const id = Date.now()
        const payloadId = `${id}tour`
        const slug = `product-sync-${id}`

        // ── Set up consumer for product.synced BEFORE publishing ─────────────────────
        const productSynced = await consumeIntegrationEvents(amqpChannel, "integration.product.synced.v1")

        // ── Set up consumer for product.created on medusa.events (to know when the product was created) ─────────────
        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")

        // ── Publish CMS event (published == "created from CMS") ──────────────────
        publishCmsTourEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildTourData({ destination: "Product Sync City", duration_days: 3 }),
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

        // ── Wait for product.created event on medusa.events exchange ─────────────
        await waitFor(() => productCreated.messages.length > 0, { timeoutMs: 30_000 })

        // ── Wait for integration.product.synced.v1 on tourism.integration exchange ────────────
        await waitFor(() => productSynced.messages.length > 0, { timeoutMs: 60_000 })

        const syncEvent = productSynced.messages[0]
        expect(syncEvent.type).toBe("integration")
        expect(syncEvent.aggregateType).toBe("product")
        expect(syncEvent.action).toBe("synced")
        expect(syncEvent.payload).toBeTruthy()
        expect(syncEvent.payload.id).toBeTruthy() // product ID
      })

      // ─── Test 2: product.updated → emit integration.product.updated.v1 ──────────

      it("should emit integration.product.updated.v1 to tourism.integration after product updated", async () => {
        const id = Date.now()
        const payloadId = `${id}tour`
        const slug = `product-update-${id}`

        // ── Pre-create the tour via published.v1 (which creates a product) ────────
        publishCmsTourEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildTourData({ destination: "Product Update City", duration_days: 3 }),
        })
        await waitFor(async () => {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          return tours.length > 0
        })

        // ── Find the product created for this tour ──────────────────────────────
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "title", "external_id"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(1)
        const productId = products[0].id

        // ── Set up consumers BEFORE updating ─────────────────────────────────────
        const productUpdated = await consumeIntegrationEvents(amqpChannel, "integration.product.updated.v1")
        const medusaProductUpdated = await consumeMedusaEvents(amqpChannel, "medusa.product.updated")

        // ── Emit product.updated via the event bus (triggers productSync subscriber) ──
        const eventBus = container.resolve(Modules.EVENT_BUS)
        await eventBus.emit({
          name: "product.updated",
          data: { id: productId },
        })

        // ── Wait for product.updated on medusa.events ─────────────────────────────
        await waitFor(() => medusaProductUpdated.messages.length > 0, { timeoutMs: 60_000 })

        // ── Wait for integration.product.updated.v1 on tourism.integration ────────
        await waitFor(() => productUpdated.messages.length > 0, { timeoutMs: 60_000 })

        const updateEvent = productUpdated.messages[0]
        expect(updateEvent.type).toBe("integration")
        expect(updateEvent.aggregateType).toBe("product")
        expect(updateEvent.action).toBe("updated")
        expect(updateEvent.payload).toBeTruthy()
expect(updateEvent.payload.id).toBe(productId)
      })

      // ─── Test 3: published.v1 → create package + emit integration.product.synced.v1 ───

      it("should emit integration.product.synced.v1 to tourism.integration after package created via CMS", async () => {
        const id = Date.now()
        const payloadId = `${id}package`
        const slug = `product-sync-pkg-${id}`

        // ── Set up consumers BEFORE publishing ────────────────────────────────────────
        const productSynced = await consumeIntegrationEvents(amqpChannel, "integration.product.synced.v1")
        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")

        // ── Publish CMS package event ──────────────────────────────────────────────────
        publishCmsPackageEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildPackageData({ destination: "Package Sync City", duration_days: 3 }),
        })

        // ── Wait for the package to be created ────────────────────────────────────────
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length > 0
        })

        // ── Wait for product.created event on medusa.events exchange ───────────────────
        await waitFor(() => productCreated.messages.length > 0, { timeoutMs: 30_000 })

        // ── Wait for integration.product.synced.v1 on tourism.integration exchange ──────
        await waitFor(() => productSynced.messages.length > 0, { timeoutMs: 60_000 })

        const syncEvent = productSynced.messages[0]
        expect(syncEvent.type).toBe("integration")
        expect(syncEvent.aggregateType).toBe("product")
        expect(syncEvent.action).toBe("synced")
        expect(syncEvent.payload).toBeTruthy()
        expect(syncEvent.payload.id).toBeTruthy()
      })

      // ─── Test 4: updated.v1 → update package + emit integration.product.updated.v1 ───

      it("should emit integration.product.updated.v1 to tourism.integration after package updated via CMS", async () => {
        const id = Date.now()
        const payloadId = `${id}package`
        const slug = `product-update-pkg-${id}`

        // ── Pre-create the package via published.v1 (which creates a product) ──────────
        publishCmsPackageEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildPackageData({ destination: "Package Update City", duration_days: 3 }),
        })
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length > 0
        })

        // ── Set up consumers BEFORE publishing the update ───────────────────────────────
        const productUpdated = await consumeIntegrationEvents(amqpChannel, "integration.product.updated.v1")
        const medusaProductUpdated = await consumeMedusaEvents(amqpChannel, "medusa.product.updated")

        // ── Publish CMS package update event with changed destination & duration ───────
        publishCmsPackageEvent(amqpChannel, "updated", {
          id,
          slug,
          data: buildPackageData({ destination: "Package Updated City", duration_days: 7 }),
        })

        // ── Wait for the package fields to change ─────────────────────────────────────
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          if (!packages.length) return false
          return packages[0].destination === "Package Updated City"
        })

        // ── Wait for product.updated on medusa.events (fires because packageUpdated now updates the product) ──
        await waitFor(() => medusaProductUpdated.messages.length > 0, { timeoutMs: 60_000 })

        // ── Wait for integration.product.updated.v1 on tourism.integration exchange ────
        await waitFor(() => productUpdated.messages.length > 0, { timeoutMs: 60_000 })

        const updateEvent = productUpdated.messages[0]
        expect(updateEvent.type).toBe("integration")
        expect(updateEvent.aggregateType).toBe("product")
        expect(updateEvent.action).toBe("updated")
        expect(updateEvent.payload).toBeTruthy()
      })

    })
  },
})