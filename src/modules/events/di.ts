import type { Logger } from "@medusajs/types"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RabbitMQEventBus } from "./bus/RabbitMQEventBus"
import { PostgresIdempotencyStore } from "./idempotency/PostgresIdempotencyStore"
import { eventRegistry } from "./registry/EventRegistry"
import type { EventsModuleOptions } from "./service"

// Trigger catalog registration side-effect
import "./registry"

export function initEventModule(
  options: EventsModuleOptions,
  container: MedusaContainer
): {
  eventBus: RabbitMQEventBus
  idempotencyStore: PostgresIdempotencyStore
  eventRegistry: typeof eventRegistry
} {
  const logger = container.resolve("logger") as Logger
  const eventBus = new RabbitMQEventBus(logger, {
    url: options.rabbitmqUrl,
    prefetch: options.prefetch,
    maxRetries: options.maxRetries,
    workerMode: options.workerMode,
  })
  const idempotencyStore = new PostgresIdempotencyStore(container)
  return { eventBus, idempotencyStore, eventRegistry }
}
