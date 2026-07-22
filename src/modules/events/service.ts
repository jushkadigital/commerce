import { MedusaService, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/types"
import type { Knex } from "@mikro-orm/knex"
import type { MedusaContainer } from "@medusajs/framework/types"
import ProcessedEvent from "./models/processed-event"
import { RabbitMQEventBus } from "./bus/RabbitMQEventBus"
import { NoOpEventBus } from "./bus/NoOpEventBus"
import type { IEventBus } from "./bus/IEventBus"
import { PostgresIdempotencyStore } from "./idempotency/PostgresIdempotencyStore"
import { EventRegistry, eventRegistry } from "./registry/EventRegistry"
import type { EventEnvelope, CreateEventInput } from "./envelope"
import { createEvent } from "./envelope"
import type { MessageHandler } from "./bus/IEventBus"

import "./registry"

const MEDEVENTS_EXCHANGE = "medusa.events"

export interface EventsModuleOptions {
  rabbitmqUrl: string
  exchanges?: {
    integration?: string
    notification?: string
    inbound?: string
    identity?: string
  }
  consumers?: Array<{
    name: string
    routingKeys: string[]
    prefetch?: number
    maxRetries?: number
    retryDelayMs?: number
  }>
  prefetch?: number
  maxRetries?: number
  workerMode?: "server" | "worker" | "shared"
}

export type EventsModuleDependencies = {
  logger: Logger
  [ContainerRegistrationKeys.PG_CONNECTION]: Knex
}

class EventModuleService extends MedusaService({
  ProcessedEvent,
}) {
  protected logger_: Logger
  protected options_: EventsModuleOptions
  protected eventBus_: IEventBus
  protected idempotencyStore_: PostgresIdempotencyStore
  protected eventRegistry_: EventRegistry
  protected cleanupTimer_: NodeJS.Timeout | null = null

  private static readonly CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000
  private static readonly CLEANUP_OLDER_THAN_DAYS = 7

  __hooks = {
    onApplicationStart: async () => {
      this.logger_.info("[events] Starting event module...")
      await this.eventBus_.connect()
      await this.setupExternalBridges()
      this.startCleanupTimer()
      this.logger_.info("[events] Event module ready")
    },
    onApplicationShutdown: async () => {
      this.stopCleanupTimer()
      await this.eventBus_.disconnect()
    },
  }

  constructor(
    dependencies: EventsModuleDependencies,
    moduleOptions: EventsModuleOptions
  ) {
    super(...arguments)

    this.logger_ = dependencies.logger
    this.options_ = moduleOptions
    this.eventRegistry_ = eventRegistry

    this.eventBus_ = moduleOptions.rabbitmqUrl
      ? new RabbitMQEventBus(this.logger_, {
          url: moduleOptions.rabbitmqUrl,
          prefetch: moduleOptions.prefetch,
          maxRetries: moduleOptions.maxRetries,
          workerMode: moduleOptions.workerMode,
        })
      : new NoOpEventBus()

    const knex = dependencies[ContainerRegistrationKeys.PG_CONNECTION]
    const containerProxy: MedusaContainer = {
      resolve: (key: string): any => {
        if (key === ContainerRegistrationKeys.PG_CONNECTION) {
          return knex
        }
        return undefined
      },
    } as MedusaContainer

    this.idempotencyStore_ = new PostgresIdempotencyStore(containerProxy)
  }

  async publish(envelope: EventEnvelope): Promise<void> {
    await this.eventBus_.publish(envelope)
  }

  async publishEvent<T>(input: CreateEventInput<T>): Promise<void> {
    const envelope = createEvent(input)
    this.logger_.info(
      `[events] Dispatching ${envelope.type}.${envelope.aggregateType}.${envelope.action}.v${envelope.version} (id=${envelope.id}, causationId=${envelope.metadata.causationId})`
    )
    await this.publish(envelope)
  }

  async subscribe(routingKey: string, handler: MessageHandler): Promise<void> {
    await this.eventBus_.subscribe(routingKey, handler)
  }

  getIdempotencyStore(): PostgresIdempotencyStore {
    return this.idempotencyStore_
  }

  getRegistry(): EventRegistry {
    return this.eventRegistry_
  }

  isReady(): boolean {
    return this.eventBus_.isReady()
  }

  private async setupExternalBridges(): Promise<void> {
    await this.bridgeIdentityEvents()
    await this.bridgeInboundCmsEvents()
  }

  private async bridgeIdentityEvents(): Promise<void> {
    const hasIdentityConsumer = this.options_.consumers?.some(
      (c) => c.routingKeys.some((k) => k.startsWith("identity."))
    )

    if (!hasIdentityConsumer) {
      return
    }

    const identityRoutingKeys = [
      "identity.user.created.v1",
      "identity.user.deleted.v1",
    ]

    for (const routingKey of identityRoutingKeys) {
      await this.eventBus_.subscribe(routingKey, async (envelope: EventEnvelope) => {
        const payload = envelope.payload as Record<string, unknown>

        const clientRoles = Array.isArray(payload.clientRoles) ? payload.clientRoles.map(String) : []
        const primaryRole = clientRoles.length > 0 ? clientRoles[0] : undefined
        const userType = String(payload.userType ?? "PASSENGER")

        const normalizedData = {
          sub: payload.aggregateId ?? payload.sub ?? payload.keycloak_sub,
          email: String(payload.email ?? ""),
          userType,
          role: primaryRole ?? payload.role,
          clientRoles,
        }

        this.logger_.info(
          `[bridge] identity → medusa.events: ${routingKey} sub=${normalizedData.sub} email=${normalizedData.email} userType=${normalizedData.userType}`
        )

        const medusaRoutingKey = `medusa.${routingKey}`
        await this.eventBus_.publishToExchange(MEDEVENTS_EXCHANGE, medusaRoutingKey, {
          name: routingKey,
          data: normalizedData,
        })
      })
    }

    this.logger_.info(
      `[bridge] Identity bridges ready: ${identityRoutingKeys.join(", ")}`
    )
  }

  private async bridgeInboundCmsEvents(): Promise<void> {
    const hasIntegrationConsumer = this.options_.consumers?.some(
      (c) => c.routingKeys.some((k) => k.startsWith("integration."))
    )

    if (!hasIntegrationConsumer) {
      return
    }

    const cmsRoutingKeys = [
      "integration.tour.published.v1",
      "integration.tour.updated.v1",
      "integration.tour.deleted.v1",
      "integration.package.published.v1",
      "integration.package.updated.v1",
      "integration.package.deleted.v1",
    ]

    for (const routingKey of cmsRoutingKeys) {
      await this.eventBus_.subscribe(routingKey, async (envelope: EventEnvelope) => {
        this.logger_.info(
          `[bridge] cms → medusa.events: ${routingKey} envelopeId=${envelope.id}`
        )

        const medusaRoutingKey = `medusa.${routingKey}`
        await this.eventBus_.publishToExchange(MEDEVENTS_EXCHANGE, medusaRoutingKey, {
          name: routingKey,
          data: envelope.payload,
          metadata: {
            source: "rabbitmq",
            correlationId: envelope.metadata.correlationId,
            causationId: envelope.metadata.causationId,
          },
        })
      })
    }

    this.logger_.info(
      `[bridge] CMS bridges ready: ${cmsRoutingKeys.join(", ")}`
    )
  }

  private startCleanupTimer(): void {
    const runCleanup = async (): Promise<void> => {
      try {
        const deleted = await this.idempotencyStore_.cleanup(
          EventModuleService.CLEANUP_OLDER_THAN_DAYS
        )
        if (deleted > 0) {
          this.logger_.info(
            `[events] Cleaned up ${deleted} processed_event rows older than ${EventModuleService.CLEANUP_OLDER_THAN_DAYS} days`
          )
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger_.warn(`[events] processed_event cleanup failed: ${message}`)
      }
    }

    void runCleanup()
    this.cleanupTimer_ = setInterval(
      () => void runCleanup(),
      EventModuleService.CLEANUP_INTERVAL_MS
    )
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer_) {
      clearInterval(this.cleanupTimer_)
      this.cleanupTimer_ = null
    }
  }
}

export default EventModuleService
