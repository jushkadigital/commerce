import type { Channel, ConfirmChannel, Options } from "amqplib"
import type {
  ConsumerBinding,
  ExchangeConfig,
  TopologyConfig,
} from "./bindings"
import { DEFAULT_TOPOLOGY_CONFIG } from "./bindings"

export interface TopologyLogger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

function isPreconditionFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    (error as { code: number }).code === 406 &&
    String((error as { message: string }).message).includes("PRECONDITION_FAILED")
  )
}

async function ensureQueue(
  channel: Channel | ConfirmChannel,
  name: string,
  options: Options.AssertQueue,
  logger?: TopologyLogger
): Promise<void> {
  try {
    await channel.assertQueue(name, options)
  } catch (error) {
    if (!isPreconditionFailure(error)) {
      throw error
    }

    logger?.warn(
      `Queue ${name} already exists with different arguments in RabbitMQ. Reusing existing queue instead of redeclaring it.`
    )
    await channel.checkQueue(name)
  }
}

async function ensureExchange(
  channel: Channel | ConfirmChannel,
  name: string,
  type: string,
  options: { durable: boolean },
  logger?: TopologyLogger
): Promise<void> {
  try {
    await channel.assertExchange(name, type, options)
  } catch (error) {
    if (!isPreconditionFailure(error)) {
      throw error
    }

    logger?.warn(
      `Exchange ${name} already exists with different arguments in RabbitMQ. Reusing existing exchange instead of redeclaring it.`
    )

    // After a 406 precondition failure, the RabbitMQ server closes the channel.
    // Calling checkExchange on a dead channel would cause another error that
    // cascades into a connection reset loop. The exchange already exists and is
    // usable, so we skip the check and move on.
    try {
      await channel.checkExchange(name)
    } catch {
      // Channel is dead — the existing exchange is still usable.
      logger?.warn(
        `Channel was closed after precondition failure on exchange ${name}. The existing exchange will be used as-is.`
      )
    }
  }
}

function resolveMainExchange(consumer: ConsumerBinding): string {
  const firstKey = consumer.routingKeys[0]

  if (firstKey?.startsWith("integration.")) {
    return "tourism.integration"
  }
  if (firstKey?.startsWith("notification.")) {
    return "tourism.notification"
  }
  if (firstKey?.startsWith("inbound.")) {
    return "tourism.inbound"
  }
  if (firstKey?.startsWith("identity.")) {
    return "identity.events"
  }

  return "tourism.integration"
}

function resolveRetryExchange(mainExchange: string): string {
  return `${mainExchange}.retry`
}

function resolveDlqExchange(mainExchange: string): string {
  return `${mainExchange}.dlx`
}

function resolveQueueName(consumer: ConsumerBinding): string {
  return `medusa.${consumer.name}`
}

function resolveRetryQueueName(consumer: ConsumerBinding): string {
  return `medusa.${consumer.name}.retry`
}

function resolveDlqQueueName(consumer: ConsumerBinding): string {
  return `medusa.${consumer.name}.dlq`
}

export async function declareTopology(
  channel: Channel | ConfirmChannel,
  config: TopologyConfig,
  logger?: TopologyLogger
): Promise<void> {
  // 1. Declare exchanges first (idempotent)
  for (const exchange of config.exchanges) {
    logger?.info(
      `Asserting exchange: ${exchange.name} (type=${exchange.type}, durable=${exchange.durable})`
    )
    await ensureExchange(
      channel,
      exchange.name,
      exchange.type,
      { durable: exchange.durable },
      logger
    )
  }

  // 2. Declare queues per consumer
  for (const consumer of config.consumers) {
    const mainExchange = resolveMainExchange(consumer)
    const retryExchange = resolveRetryExchange(mainExchange)
    const dlqExchange = resolveDlqExchange(mainExchange)
    const queueName = resolveQueueName(consumer)
    const retryQueueName = resolveRetryQueueName(consumer)
    const dlqQueueName = resolveDlqQueueName(consumer)
    const queueType = consumer.queueType ?? "quorum"
    const retryDelayMs = consumer.retryDelayMs ?? 30000

    // Main queue with DLQ binding
    logger?.info(
      `Asserting main queue: ${queueName} (type=${queueType}, dlqExchange=${dlqExchange})`
    )
    await ensureQueue(
      channel,
      queueName,
      {
        durable: true,
        deadLetterExchange: dlqExchange,
        deadLetterRoutingKey: dlqQueueName,
        arguments: {
          "x-queue-type": queueType,
        },
      },
      logger
    )

    // Retry queue with TTL → routes back to main exchange
    logger?.info(
      `Asserting retry queue: ${retryQueueName} (ttl=${retryDelayMs}ms, backTo=${mainExchange})`
    )
    await ensureQueue(
      channel,
      retryQueueName,
      {
        durable: true,
        messageTtl: retryDelayMs,
        deadLetterExchange: mainExchange,
        deadLetterRoutingKey: "#",
        arguments: {
          "x-queue-type": queueType,
        },
      },
      logger
    )

    // DLQ queue
    logger?.info(`Asserting DLQ queue: ${dlqQueueName} (type=${queueType})`)
    await ensureQueue(
      channel,
      dlqQueueName,
      {
        durable: true,
        arguments: {
          "x-queue-type": queueType,
        },
      },
      logger
    )

    // 3. Bind queues to exchanges
    // Main queue → main exchange with routing keys
    for (const routingKey of consumer.routingKeys) {
      logger?.info(
        `Binding main queue ${queueName} to exchange ${mainExchange} with key: ${routingKey}`
      )
      await channel.bindQueue(queueName, mainExchange, routingKey)
    }

    // Retry queue → retry exchange (bound with the retry queue name as routing key)
    logger?.info(
      `Binding retry queue ${retryQueueName} to exchange ${retryExchange} with key: ${retryQueueName}`
    )
    await channel.bindQueue(retryQueueName, retryExchange, retryQueueName)

    // DLQ queue → DLQ exchange (bound with the DLQ queue name as routing key)
    logger?.info(
      `Binding DLQ queue ${dlqQueueName} to exchange ${dlqExchange} with key: ${dlqQueueName}`
    )
    await channel.bindQueue(dlqQueueName, dlqExchange, dlqQueueName)
  }

  logger?.info("RabbitMQ topology declaration complete.")
}

export function buildTopologyConfig(
  options: Partial<TopologyConfig> = {}
): TopologyConfig {
  return {
    exchanges: options.exchanges ?? DEFAULT_TOPOLOGY_CONFIG.exchanges,
    consumers: options.consumers ?? DEFAULT_TOPOLOGY_CONFIG.consumers,
  }
}
