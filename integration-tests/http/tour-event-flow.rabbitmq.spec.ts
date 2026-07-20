import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fs from "fs"
import amqp from "amqplib"
import { TOUR_MODULE } from "../../src/modules/tour"
import type TourModuleService from "../../src/modules/tour/service"

// ─── Read RabbitMQ URL from temp file (written by global setup) ───────────────
const RABBITMQ_URL = fs.readFileSync("/tmp/rabbitmq-test-url.txt", "utf-8").trim()

jest.setTimeout(180_000)

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

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    RABBITMQ_URL,
    TEST_RABBITMQ: "true",
  },
  testSuite: ({ getContainer }) => {
    describe("Tour Event Flow via RabbitMQ (testcontainers)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let query: any
      let amqpConnection: any
      let amqpChannel: amqp.Channel

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        query = container.resolve(ContainerRegistrationKeys.QUERY)

        // Connect to RabbitMQ for test operations (publish CMS event, consume product.created)
        amqpConnection = await amqp.connect(RABBITMQ_URL)
        amqpChannel = await amqpConnection.createChannel()

        // Wait for Medusa to declare exchanges (event bus + events module)
        await waitForExchange(amqpChannel, "medusa.events")
        await waitForExchange(amqpChannel, "tourism.integration")
      })

      afterAll(async () => {
        await amqpChannel?.close()
        await amqpConnection?.close()
      })

      it("should receive CMS integration.tour.published.v1 → create tour+product → emit product.created", async () => {
        // ── Unique test event ID ─────────────────────────────────────────────
        const testEventId = Date.now()
        const payloadId = `${testEventId}tour`

        // ── Set up consumer for product.created BEFORE publishing ──────────────
        const productCreatedMessages: any[] = []
        const { queue: productQueue } = await amqpChannel.assertQueue("", {
          exclusive: true,
        })
        await amqpChannel.bindQueue(productQueue, "medusa.events", "medusa.product.created")
        await amqpChannel.consume(productQueue, (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            productCreatedMessages.push(JSON.parse(msg.content.toString()))
            amqpChannel.ack(msg)
          }
        })

        // ── Publish CMS event to tourism.integration exchange ─────────────────
        const cmsEventData = {
          id: testEventId,
          slug: `test-tour-${testEventId}`,
          data: {
            destination: "Machu Picchu Test",
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
            duration_days: 3,
            max_capacity: 20,
            thumbnail: "https://example.com/test-tour.jpg",
            price: 150,
            categories: [{ name: "Adventure" }],
            destinos: { name: "Cusco" },
            difficulty: "medium",
          },
        }

        amqpChannel.publish(
          "tourism.integration",
          "integration.tour.published.v1",
          Buffer.from(JSON.stringify(cmsEventData)),
          {
            contentType: "application/json",
            persistent: true,
            headers: {
              "x-event-version": "1",
              "x-event-type": "integration",
              "x-aggregate-type": "tour",
              "x-action": "published",
              "x-source": "cms",
            },
          }
        )

        // ── Wait for tour to be created (poll up to 60s) ──────────────────────
        let tour: any = null
        for (let i = 0; i < 60; i++) {
          const tours = await tourModuleService.getTourByMetadata(payloadId)
          if (tours.length > 0) {
            tour = tours[0]
            break
          }
          await sleep(1_000)
        }

        // ── Assertions: Tour created ─────────────────────────────────────────
        expect(tour).not.toBeNull()
        expect(tour.destination).toBe("Machu Picchu Test")
        expect(tour.duration_days).toBe(3)
        expect(tour.slug).toBe(`test-tour-${testEventId}`)

        // ── Wait for product.created event (poll up to 30s) ──────────────────
        for (let i = 0; i < 30; i++) {
          if (productCreatedMessages.length > 0) break
          await sleep(1_000)
        }

        // ── Assertions: product.created emitted ──────────────────────────────
        expect(productCreatedMessages.length).toBeGreaterThan(0)

        const productEvent = productCreatedMessages[0]
        expect(productEvent.name).toBe("product.created")

        // ── Assertions: Product exists in DB with external_id ─────────────────
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "title", "external_id", "status"],
          filters: { external_id: payloadId },
        })
        expect(products.length).toBe(1)
        expect(products[0].external_id).toBe(payloadId)
      })
    })
  },
})
