import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sign } from "jsonwebtoken"
import fs from "fs"
import amqp from "amqplib"
import { createTourWorkflow, CreateTourWorkflowInput } from "../../src/workflows/create-tour"
import { TOUR_MODULE } from "../../src/modules/tour"
import TourModuleService from "../../src/modules/tour/service"

jest.setTimeout(180_000)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForExchange(channel: amqp.Channel, exchange: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try { await channel.checkExchange(exchange); return } catch { await sleep(1_000) }
  }
  throw new Error(`Exchange "${exchange}" not available after ${maxAttempts}s`)
}

const RABBITMQ_URL = (() => {
  try { return fs.readFileSync("/tmp/rabbitmq-test-url.txt", "utf-8").trim() }
  catch { return process.env.RABBITMQ_URL || "amqp://admin:admin123@172.17.0.1:5672" }
})()

medusaIntegrationTestRunner({
  inApp: true,
  env: { RABBITMQ_URL, TEST_RABBITMQ: "true" },
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/tours/:id — RabbitMQ integration.product.updated.v1 (real broker)", () => {
      let container: any
      let tourModuleService: TourModuleService
      let productModule: any
      let query: any
      let adminHeaders: Record<string, string>
      let amqpConnection: any
      let amqpChannel: amqp.Channel
      let createdTourIds: string[] = []

      beforeAll(async () => {
        container = getContainer()
        tourModuleService = container.resolve(TOUR_MODULE)
        productModule = container.resolve(Modules.PRODUCT)
        query = container.resolve(ContainerRegistrationKeys.QUERY)
        amqpConnection = await amqp.connect(RABBITMQ_URL)
        amqpChannel = await amqpConnection.createChannel()
        await waitForExchange(amqpChannel, "tourism.integration")
      })

      afterAll(async () => {
        await amqpChannel?.close()
        await amqpConnection?.close()
      })

      beforeEach(async () => {
        adminHeaders = await createAdminUser(container)
      })

      afterEach(async () => {
        for (const tourId of createdTourIds) {
          await cleanupTour(tourId)
        }
        createdTourIds = []
      })

      async function createAdminUser(c: any): Promise<Record<string, string>> {
        const userModule = c.resolve(Modules.USER)
        const authModule = c.resolve(Modules.AUTH)
        const user = await userModule.createUsers({
          email: `admin-${Date.now()}@medusa-test.com`,
          first_name: "Tour",
          last_name: "RmqTest",
        })
        const authIdentity = await authModule.createAuthIdentities({
          provider_identities: [{
            provider: "emailpass",
            entity_id: user.email,
            provider_metadata: { password: "supersecret" },
          }],
          app_metadata: { user_id: user.id },
        })
        const token = sign(
          { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
          process.env.JWT_SECRET || "supersecret",
          { expiresIn: "1d" }
        )
        return { authorization: `Bearer ${token}` }
      }

      async function createTourFixture(overrides: Partial<CreateTourWorkflowInput> = {}): Promise<any> {
        const input: CreateTourWorkflowInput = {
          destination: "RabbitMQ Update Test Tour",
          description: "Tour for real RabbitMQ update event tests",
          duration_days: 2,
          max_capacity: 10,
          prices: { adult: 300, child: 150, infant: 0, currency_code: "PEN" },
          ...overrides,
        }
        const { result } = await createTourWorkflow(container).run({ input })
        createdTourIds.push(result.tour.id)
        return result.tour
      }

      async function consumeProductUpdatedEvent(timeoutSeconds = 30): Promise<any | null> {
        const { queue } = await amqpChannel.assertQueue("", { exclusive: true })
        await amqpChannel.bindQueue(queue, "tourism.integration", "integration.product.updated.v1")
        return new Promise((resolve) => {
          let resolved = false
          const timer = setTimeout(() => {
            if (!resolved) { resolved = true; resolve(null) }
          }, timeoutSeconds * 1000)
          amqpChannel.consume(queue, (msg: amqp.ConsumeMessage | null) => {
            if (msg && !resolved) {
              resolved = true
              clearTimeout(timer)
              amqpChannel.ack(msg)
              try { resolve(JSON.parse(msg.content.toString())) } catch { resolve(null) }
            }
          })
        })
      }

      async function getRawPrices(variantIds: string[]): Promise<any[]> {
        const { data: variantsWithPrices } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set.id", "price_set.prices.*"],
          filters: { id: variantIds },
        })
        return (variantsWithPrices || []).flatMap((v: any) => v.price_set?.prices || [])
      }

      async function cleanupTour(tourId: string): Promise<void> {
        try {
          const tour = await tourModuleService.retrieveTour(tourId)
          const tourVariants = await tourModuleService.listTourVariants({ tour_id: tourId })
          if (tourVariants.length > 0) {
            await tourModuleService.deleteTourVariants(tourVariants.map((tv: any) => tv.id))
          }
          await tourModuleService.deleteTours(tourId)
          if (tour.product_id) {
            const product = await productModule.retrieveProduct(tour.product_id, { relations: ["variants"] })
            for (const variant of product.variants || []) {
              await productModule.deleteProductVariants(variant.id)
            }
            await productModule.deleteProducts(tour.product_id)
          }
        } catch (error) {
          console.error(`Cleanup error for tour ${tourId}:`, error)
        }
      }

      // ─── CASO 1: actualizar precios → integration.product.updated.v1 llega al exchange real ───
      it("updates prices via POST /admin/tours/:id and integration.product.updated.v1 arrives at RabbitMQ", async () => {
        const tour = await createTourFixture()

        // Setup consumer BEFORE the update
        const eventPromise = consumeProductUpdatedEvent(30)

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 500, child: 250, infant: 50, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        expect(response.status).toBe(200)
        expect(response.data.tour).toBeDefined()

        // Wait for the actual RabbitMQ message
        const envelope = await eventPromise
        expect(envelope).not.toBeNull()
        expect(envelope.type).toBe("integration")
        expect(envelope.aggregateType).toBe("product")
        expect(envelope.action).toBe("updated")
        expect(envelope.version).toBe(1)
        expect(envelope.spec).toBe("tourism-events/v1")
        expect(envelope.id).toBeDefined()
        expect(envelope.timestamp).toBeDefined()
        expect(envelope.source).toBe("medusa-backend")
        expect(envelope.payload).toBeDefined()
        expect(envelope.payload.id).toBe(tour.product_id)

        // The payload includes variants with the NEW prices
        const payloadVariants = envelope.payload.variants || []
        expect(payloadVariants.length).toBe(3)
        const adultVariant = payloadVariants.find((v: any) => v.title === "Adult")
        expect(adultVariant).toBeDefined()
        const adultPrices = adultVariant.prices || []
        const penPrice = adultPrices.find((p: any) => p.currency_code === "pen" || p.currency_code === "PEN")
        expect(penPrice).toBeDefined()
        expect(Number(penPrice.amount)).toBe(500)
      })

      // ─── CASO 2: actualizar sin prices → NO llega integration.product.updated.v1 al exchange real ───
      it("updates tour without prices and integration.product.updated.v1 does NOT arrive at RabbitMQ", async () => {
        const tour = await createTourFixture()

        // Setup consumer — expect NO event within 10s
        const eventPromise = consumeProductUpdatedEvent(10)

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { destination: "Updated Tour No Prices" },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        const envelope = await eventPromise
        expect(envelope).toBeNull()
      })

      // ─── CASO 3: el envelope tiene metadata de causation/correlation ───
      it("publishes integration.product.updated.v1 with causationId tracing back to the update", async () => {
        const tour = await createTourFixture()

        const eventPromise = consumeProductUpdatedEvent(30)

        await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 600, child: 300, infant: 0, currency_code: "PEN" } },
          { headers: adminHeaders }
        )

        const envelope = await eventPromise
        expect(envelope).not.toBeNull()
        expect(envelope.metadata).toBeDefined()
        expect(envelope.metadata.correlationId).toBeDefined()
        expect(envelope.metadata.causationId).toBeDefined()
        // The causationId traces back to the product update action
        expect(envelope.metadata.causationId).toContain("medusa:")
        expect(envelope.metadata.causationId).toContain(tour.product_id)
      })

      // ─── CASO 4 (causal-link positivo): workflow commitea precio 555 → ese MISMO precio viaja en el evento ───
      it("workflow commits price 555 to DB and the SAME price 555 arrives in the RabbitMQ event", async () => {
        const tour = await createTourFixture()
        const variantIds = (await tourModuleService.retrieveTour(tour.id, { relations: ["variants"] }))
          .variants.map((v: any) => v.variant_id).filter(Boolean)

        // Setup consumer BEFORE the update
        const eventPromise = consumeProductUpdatedEvent(30)

        const response = await api.post(
          `/admin/tours/${tour.id}`,
          { prices: { adult: 555, child: 277, infant: 0, currency_code: "PEN" } },
          { headers: adminHeaders }
        )
        expect(response.status).toBe(200)

        // ── STEP 1: verify the price PERSISTED in the DB (proof the workflow committed) ──
        const rawPrices = await getRawPrices(variantIds)
        const persistedAdultPrice = rawPrices.find(
          (p: any) => Number(p.amount) === 555 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(persistedAdultPrice).toBeDefined()
        expect(Number(persistedAdultPrice.amount)).toBe(555)

        // ── STEP 2: verify the event arrived at RabbitMQ ──
        const envelope = await eventPromise
        expect(envelope).not.toBeNull()
        expect(envelope.aggregateType).toBe("product")
        expect(envelope.action).toBe("updated")

        // ── STEP 3: verify the SAME price (555) that persisted in DB is in the event payload ──
        const payloadVariants = envelope.payload.variants || []
        const adultVariant = payloadVariants.find((v: any) => v.title === "Adult")
        expect(adultVariant).toBeDefined()
        const adultPrices = adultVariant.prices || []
        const eventAdultPrice = adultPrices.find(
          (p: any) => Number(p.amount) === 555 && (p.currency_code === "pen" || p.currency_code === "PEN")
        )
        expect(eventAdultPrice).toBeDefined()
        expect(Number(eventAdultPrice.amount)).toBe(555)

        // The DB price and the event price are the SAME value — proving the event
        // reflects the committed mutation, not a stale or independent value.
        expect(Number(persistedAdultPrice.amount)).toBe(Number(eventAdultPrice.amount))
      })

      // ─── CASO 5 (causal-link negativo): workflow falla (tour inexistente) → NO se publica evento ───
      it("workflow fails for a non-existent tour and NO integration.product.updated.v1 is published", async () => {
        // Setup consumer — expect NO event
        const eventPromise = consumeProductUpdatedEvent(10)

        // Call the endpoint with a non-existent tour id — the workflow will throw
        // (updateTourStep tries to retrieve a tour that doesn't exist)
        let response: any
        try {
          response = await api.post(
            `/admin/tours/non-existent-tour-id-12345`,
            { prices: { adult: 100, child: 50, infant: 0, currency_code: "PEN" } },
            { headers: adminHeaders }
          )
        } catch (err: any) {
          response = err.response
        }

        // The workflow fails → route catches and returns 500
        expect(response.status).toBe(500)

        // No event should arrive (within 10s) — the route only publishes AFTER a successful workflow run
        const envelope = await eventPromise
        expect(envelope).toBeNull()
      })
    })
  },
})