import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import amqp from "amqplib"
import { PACKAGE_MODULE } from "../../src/modules/package"
import type PackageModuleService from "../../src/modules/package/service"

// ─── Read RabbitMQ URL from temp file (written by global setup) ───────────────
const RABBITMQ_URL = fs.readFileSync("/tmp/rabbitmq-test-url.txt", "utf-8").trim()

jest.setTimeout(900_000)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

// Set up a consumer on the medusa.events exchange for a given routing key.
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
    describe("Package lifecycle events received via RabbitMQ (testcontainers)", () => {
      let container: any
      let packageModuleService: PackageModuleService
      let query: any
      let amqpConnection: any
      let amqpChannel: amqp.Channel

      beforeAll(async () => {
        container = getContainer()
        packageModuleService = container.resolve(PACKAGE_MODULE)
        query = container.resolve(ContainerRegistrationKeys.QUERY)

        amqpConnection = await amqp.connect(RABBITMQ_URL)
        amqpChannel = await amqpConnection.createChannel()

        await sleep(5_000)
        try {
          await amqpChannel.assertExchange("medusa.events", "topic", { durable: true })
        } catch {
          await sleep(3_000)
          await amqpChannel.assertExchange("medusa.events", "topic", { durable: true })
        }
      })

      afterAll(async () => {
        await amqpChannel?.close()
        await amqpConnection?.close()
      })

      // ─── 1. published.v1 → create package + emit product.created ──────────────

      it("should receive integration.package.published.v1, create a package, and emit product.created", async () => {
        const id = Date.now()
        const slug = `pkg-created-${id}`
        const payloadId = `${id}package`

        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")

        publishCmsPackageEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildPackageData({ destination: "Machu Picchu Package", duration_days: 3 }),
        })

        let createdPackage: any = null
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          if (packages.length > 0) {
            createdPackage = packages[0]
            return true
          }
          return false
        })

        expect(createdPackage).not.toBeNull()
        expect(createdPackage.destination).toBe("Machu Picchu Package")
        expect(createdPackage.duration_days).toBe(3)
        expect(createdPackage.slug).toBeTruthy()

        await waitFor(() => productCreated.messages.length > 0, { timeoutMs: 30_000 })
        expect(productCreated.messages[0].name).toBe("product.created")

        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "title", "external_id", "status"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(1)
        expect(products[0].external_id).toBe(payloadId)
      })

      // ─── 2. updated.v1 → update package ───────────────────────────────────────

      it("should receive integration.package.updated.v1 and update the package", async () => {
        const id = Date.now()
        const slug = `pkg-updated-${id}`
        const payloadId = `${id}package`

        publishCmsPackageEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildPackageData({ destination: "Original Package City", duration_days: 3 }),
        })
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length > 0
        })

        publishCmsPackageEvent(amqpChannel, "updated", {
          id,
          slug,
          data: buildPackageData({ destination: "Updated Package City", duration_days: 7 }),
        })

        let updatedPackage: any = null
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          if (!packages.length) return false
          const p = packages[0]
          if (p.destination === "Updated Package City" && p.duration_days === 7) {
            updatedPackage = p
            return true
          }
          return false
        })

        expect(updatedPackage.destination).toBe("Updated Package City")
        expect(updatedPackage.duration_days).toBe(7)
      })

      // ─── 3. deleted.v1 → delete package + product ─────────────────────────────

      it("should receive integration.package.deleted.v1 and delete the package", async () => {
        const id = Date.now()
        const slug = `pkg-deleted-${id}`
        const payloadId = `${id}package`

        publishCmsPackageEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildPackageData({ destination: "ToDelete Package City", duration_days: 2 }),
        })
        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length > 0
        })

        publishCmsPackageEvent(amqpChannel, "deleted", { id })

        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length === 0
        })

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

        expect((await packageModuleService.getPackageByMetadata(payloadId)).length).toBe(0)

        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "external_id"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(0)
      })

      // ─── 4. Batch: 3 different events simultaneously ───────────────────────────

      it("should receive 3 package.published events in batch without duplicate errors", async () => {
        const baseId = Date.now()
        const ids = [baseId, baseId + 1, baseId + 2]
        const payloadIds = ids.map((id) => `${id}package`)

        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")

        ids.forEach((id, i) => {
          publishCmsPackageEvent(amqpChannel, "published", {
            id,
            slug: `batch-pkg-${id}`,
            data: buildPackageData({
              destination: `Batch Package City ${i + 1}`,
              duration_days: i + 2,
            }),
          })
        })

        await waitFor(async () => {
          for (const pid of payloadIds) {
            const packages = await packageModuleService.getPackageByMetadata(pid)
            if (packages.length === 0) return false
          }
          return true
        }, { timeoutMs: 120_000 })

        for (let i = 0; i < 3; i++) {
          const packages = await packageModuleService.getPackageByMetadata(payloadIds[i])
          expect(packages.length).toBe(1)
          expect(packages[0].destination).toBe(`Batch Package City ${i + 1}`)
          expect(packages[0].duration_days).toBe(i + 2)
        }

        await waitFor(async () => productCreated.messages.length >= 3, { timeoutMs: 30_000 })

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

      // ─── 5. Idempotency: same event 3 times → only 1 package ───────────────────

      it("should handle duplicate package.published events without creating duplicates", async () => {
        const id = Date.now()
        const slug = `idempotent-pkg-${id}`
        const payloadId = `${id}package`

        for (let i = 0; i < 3; i++) {
          publishCmsPackageEvent(amqpChannel, "published", {
            id,
            slug,
            data: buildPackageData({ destination: "Idempotent Package City", duration_days: 5 }),
          })
          if (i < 2) await sleep(3000)
        }

        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length > 0
        })

        await sleep(5_000)

        const packages = await packageModuleService.getPackageByMetadata(payloadId)
        expect(packages.length).toBe(1)
        expect(packages[0].destination).toBe("Idempotent Package City")
        expect(packages[0].duration_days).toBe(5)

        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "external_id"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(1)
      })

      // ─── 6. Concurrent: same destination+duration, different CMS IDs ──────────

      it("should create two packages with same destination+duration concurrently without handle collision", async () => {
        const id1 = Date.now()
        const id2 = id1 + 1
        const payloadId1 = `${id1}package`
        const payloadId2 = `${id2}package`

        publishCmsPackageEvent(amqpChannel, "published", {
          id: id1,
          slug: `same-dest-pkg-${id1}`,
          data: buildPackageData({ destination: "Same Package Destination", duration_days: 3 }),
        })
        publishCmsPackageEvent(amqpChannel, "published", {
          id: id2,
          slug: `same-dest-pkg-${id2}`,
          data: buildPackageData({ destination: "Same Package Destination", duration_days: 3 }),
        })

        await waitFor(async () => {
          const p1 = await packageModuleService.getPackageByMetadata(payloadId1)
          const p2 = await packageModuleService.getPackageByMetadata(payloadId2)
          return p1.length > 0 && p2.length > 0
        }, { timeoutMs: 60_000 })

        const packages1 = await packageModuleService.getPackageByMetadata(payloadId1)
        const packages2 = await packageModuleService.getPackageByMetadata(payloadId2)
        expect(packages1.length).toBe(1)
        expect(packages2.length).toBe(1)
        expect(packages1[0].destination).toBe("Same Package Destination")
        expect(packages2[0].destination).toBe("Same Package Destination")

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
        expect(products1[0].handle).not.toBe(products2[0].handle)
      })

      // ─── 7. Verify all expected events are emitted to RabbitMQ ────────────────

      it("should emit product.created, entityPackage.created, and notification.package.synced to RabbitMQ", async () => {
        const id = Date.now()
        const slug = `pkg-event-verify-${id}`
        const payloadId = `${id}package`

        const productCreated = await consumeMedusaEvents(amqpChannel, "medusa.product.created")
        const entityPackageCreated = await consumeMedusaEvents(amqpChannel, "medusa.entityPackage.created")

        const packageSyncedMessages: any[] = []
        const { queue: notifQueue } = await amqpChannel.assertQueue("", { exclusive: true })
        await amqpChannel.bindQueue(notifQueue, "tourism.notification", "notification.package.synced.v1")
        await amqpChannel.consume(notifQueue, (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            packageSyncedMessages.push(JSON.parse(msg.content.toString()))
            amqpChannel.ack(msg)
          }
        })

        publishCmsPackageEvent(amqpChannel, "published", {
          id,
          slug,
          data: buildPackageData({ destination: "Event Verify Package City", duration_days: 4 }),
        })

        await waitFor(async () => {
          const packages = await packageModuleService.getPackageByMetadata(payloadId)
          return packages.length > 0
        })

        await waitFor(() => productCreated.messages.length > 0, { timeoutMs: 30_000 })
        expect(productCreated.messages[0].name).toBe("product.created")

        await waitFor(() => entityPackageCreated.messages.length > 0, { timeoutMs: 30_000 })
        expect(entityPackageCreated.messages[0].name).toBe("entityPackage.created")

        await waitFor(() => packageSyncedMessages.length > 0, { timeoutMs: 30_000 })
        const syncedEvent = packageSyncedMessages[0]
        expect(syncedEvent.type).toBe("notification")
        expect(syncedEvent.aggregateType).toBe("package")
        expect(syncedEvent.action).toBe("synced")
        expect(syncedEvent.payload.destination).toBe("Event Verify Package City")
      })
    })
  },
})
