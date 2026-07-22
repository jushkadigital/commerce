import type { Logger } from "@medusajs/types"
import type { ConsumeMessage } from "amqplib"
import type {
  EventBusOptions,
  IEventBus,
  MessageHandler,
} from "./IEventBus"
import { RabbitMQConnection } from "./connection"
import type { EventEnvelope } from "../envelope"
import { buildRoutingKey } from "../envelope"
import { declareTopology, DEFAULT_TOPOLOGY_CONFIG } from "../topology"
import {
  injectTraceContextIntoEnvelope,
  extractTraceContextFromEnvelope,
  startEventSpan,
  recordPublish,
  recordConsume,
  recordFailure,
  recordRetry,
  recordDeadLetter,
} from "../tracing"

const SELF_ORIGIN = "medusa-backend"
const DEFAULT_PREFETCH = 10
const DEFAULT_MAX_RETRIES = 3

const EXCHANGE_MAP: Record<string, string> = {
  integration: "tourism.integration",
  notification: "tourism.notification",
  inbound: "tourism.inbound",
  identity: "identity.events",
}

export class RabbitMQEventBus implements IEventBus {
  private connection: RabbitMQConnection
  private handlers = new Map<string, MessageHandler[]>()
  private consumers = new Map<string, string>() // queueName -> consumerTag
  private queueRoutingKeys = new Map<string, Set<string>>() // queueName -> routingKeys
  private logger: Logger
  private options: EventBusOptions
  private returnedMessagesLogged = false

  constructor(logger: Logger, options: EventBusOptions) {
    this.logger = logger
    this.options = options
    this.connection = new RabbitMQConnection(options.url, logger)
  }

  async connect(): Promise<void> {
    await this.connection.connect()
    const channel = this.connection.getChannel()
    if (!channel) {
      throw new Error("RabbitMQ channel not available after connect")
    }
    await declareTopology(channel, DEFAULT_TOPOLOGY_CONFIG, this.logger)
    this.bindChannelEvents(channel)
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect()
    this.handlers.clear()
    this.consumers.clear()
  }

  isReady(): boolean {
    return this.connection.getReady()
  }

  async publish(envelope: EventEnvelope): Promise<void> {
    if (!this.isReady()) {
      throw new Error("RabbitMQ not ready")
    }

    const channel = this.connection.getChannel()
    if (!channel) {
      throw new Error("RabbitMQ channel not available")
    }

    const enriched = injectTraceContextIntoEnvelope(envelope)
    const eventType = `${envelope.type}.${envelope.aggregateType}.${envelope.action}`
    const startTime = performance.now()

    const exchange = this.resolveExchange(enriched)
    const routingKey = buildRoutingKey(
      enriched.type,
      enriched.aggregateType,
      enriched.action,
      enriched.version
    )
    const buffer = Buffer.from(JSON.stringify(enriched))

    const publishOptions: Parameters<typeof channel.publish>[3] = {
      contentType: "application/json",
      persistent: true,
      mandatory: true,
      messageId: enriched.id,
      correlationId: enriched.metadata?.correlationId,
      type: routingKey,
      headers: {
        "x-event-version": String(enriched.version),
        "x-event-type": enriched.type,
        "x-aggregate-type": enriched.aggregateType,
        "x-action": enriched.action,
        "x-source": enriched.source,
        "x-origin-service": SELF_ORIGIN,
        ...(enriched.metadata?.traceContext || {}),
      },
    }

    await this.publishAndConfirm(channel, exchange, routingKey, buffer, publishOptions)

    const durationMs = performance.now() - startTime
    recordPublish(eventType, durationMs)

    this.logger.info(
      `[rabbitmq] Published to exchange="${exchange}" routingKey="${routingKey}" messageId="${enriched.id}" (${durationMs.toFixed(0)}ms)`
    )
  }

  async publishToExchange(
    exchange: string,
    routingKey: string,
    payload: Record<string, unknown>,
    options?: { persistent?: boolean; headers?: Record<string, string> }
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error("RabbitMQ not ready")
    }

    const channel = this.connection.getChannel()
    if (!channel) {
      throw new Error("RabbitMQ channel not available")
    }

    const buffer = Buffer.from(JSON.stringify(payload))

    await this.publishAndConfirm(channel, exchange, routingKey, buffer, {
      contentType: "application/json",
      persistent: options?.persistent ?? true,
      mandatory: false,
      headers: options?.headers ?? {},
    })
  }

  async publishBatch(envelopes: EventEnvelope[]): Promise<void> {
    for (const envelope of envelopes) {
      await this.publish(envelope)
    }
  }

  async subscribe(routingKey: string, handler: MessageHandler): Promise<void> {
    const channel = this.connection.getChannel()
    if (!channel) {
      throw new Error("RabbitMQ channel not available")
    }

    const existing = this.handlers.get(routingKey) || []
    this.handlers.set(routingKey, [...existing, handler])

    const queueName = this.resolveQueueForRoutingKey(routingKey)

    const queueKeys = this.queueRoutingKeys.get(queueName) || new Set<string>()
    queueKeys.add(routingKey)
    this.queueRoutingKeys.set(queueName, queueKeys)

    if (this.consumers.has(queueName)) {
      return
    }

    await channel.prefetch(this.options.prefetch ?? DEFAULT_PREFETCH)

    const { consumerTag } = await channel.consume(
      queueName,
      async (msg) => {
        if (!msg) {
          return
        }
        await this.handleConsumerMessage(msg)
      },
      { noAck: false }
    )

    this.consumers.set(queueName, consumerTag)
  }

  async unsubscribe(routingKey: string): Promise<void> {
    const queueName = this.resolveQueueForRoutingKey(routingKey)

    this.handlers.delete(routingKey)

    const queueKeys = this.queueRoutingKeys.get(queueName)
    if (queueKeys) {
      queueKeys.delete(routingKey)
      if (queueKeys.size === 0) {
        const consumerTag = this.consumers.get(queueName)
        if (consumerTag) {
          const channel = this.connection.getChannel()
          if (channel) {
            await channel.cancel(consumerTag)
          }
          this.consumers.delete(queueName)
        }
        this.queueRoutingKeys.delete(queueName)
      }
    }
  }

  ack(message: unknown): void {
    const msg = message as ConsumeMessage
    this.connection.getChannel()?.ack(msg)
  }

  nack(message: unknown, requeue = false): void {
    const msg = message as ConsumeMessage
    this.connection.getChannel()?.nack(msg, false, requeue)
  }

  async onApplicationStart(): Promise<void> {
    await this.connect()
  }

  async onApplicationShutdown(): Promise<void> {
    await this.disconnect()
  }

  private resolveExchange(envelope: EventEnvelope): string {
    return EXCHANGE_MAP[envelope.type] || "tourism.integration"
  }

  private resolveQueueForRoutingKey(routingKey: string): string {
    const parts = routingKey.split(".")
    const category = parts[0]
    const entity = parts[1]

    for (const consumer of DEFAULT_TOPOLOGY_CONFIG.consumers) {
      for (const pattern of consumer.routingKeys) {
        const patternParts = pattern.split(".")
        if (patternParts[0] === category && patternParts[1] === entity) {
          return `medusa.${consumer.name}`
        }
      }
    }

    return `medusa.${entity || "default"}`
  }

  private bindChannelEvents(channel: Exclude<ReturnType<RabbitMQConnection["getChannel"]>, null>): void {
    channel.on("return", (msg) => {
      if (!this.returnedMessagesLogged) {
        this.returnedMessagesLogged = true
      }
    })
  }

  private publishAndConfirm(
    channel: Exclude<ReturnType<RabbitMQConnection["getChannel"]>, null>,
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: Parameters<typeof channel.publish>[3]
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      channel.publish(exchange, routingKey, content, options, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  private async handleConsumerMessage(msg: ConsumeMessage): Promise<void> {
    const messageRoutingKey = msg.fields.routingKey || ""

    if (this.isSelfProducedMessage(msg)) {
      this.ack(msg)
      return
    }

    let envelope: EventEnvelope
    try {
      envelope = this.normalizeToEnvelope(msg)
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      await this.routeToDeadLetter(msg, messageRoutingKey, normalized)
      return
    }

    const handlers = this.handlers.get(messageRoutingKey) || []

    if (handlers.length === 0) {
      this.ack(msg)
      return
    }

    const eventType = `${envelope.type}.${envelope.aggregateType}.${envelope.action}`
    const span = startEventSpan(`event.consume.${messageRoutingKey}`, envelope)
    const startTime = performance.now()

    try {
      for (const handler of handlers) {
        await handler(envelope, msg)
      }
      this.ack(msg)

      const durationMs = performance.now() - startTime
      recordConsume(eventType, durationMs)
      span.setStatus({ code: 1 }) // OK
      span.end()
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))

      recordFailure(eventType)
      span.setStatus({ code: 2, message: normalized.message }) // ERROR
      span.recordException(normalized)
      span.end()

      await this.handleConsumerFailure(msg, messageRoutingKey, normalized)
    }
  }

  private isSelfProducedMessage(msg: ConsumeMessage): boolean {
    return msg.properties.headers?.["x-origin-service"] === SELF_ORIGIN
  }

  private normalizeToEnvelope(msg: ConsumeMessage): EventEnvelope {
    const rawContent = JSON.parse(msg.content.toString())

    // Already a full EventEnvelope
    if (
      typeof rawContent === "object" &&
      rawContent !== null &&
      rawContent.spec === "tourism-events/v1"
    ) {
      return rawContent as EventEnvelope
    }

    // Flat body + headers → construct envelope
    const headers = msg.properties.headers || {}
    const routingKey = msg.fields.routingKey || ""
    const category = routingKey.split(".")[0] || "integration"
    const versionRaw = headers["x-event-version"]
    const version = typeof versionRaw === "number"
      ? versionRaw
      : typeof versionRaw === "string"
        ? parseInt(versionRaw, 10)
        : 1

    return {
      id: msg.properties.messageId || crypto.randomUUID(),
      type: (category === "integration" || category === "notification" || category === "inbound" || category === "identity")
        ? category
        : "integration",
      aggregateType: String(headers["x-aggregate-type"] || routingKey.split(".")[1] || "unknown"),
      action: String(headers["x-action"] || routingKey.split(".")[2] || "unknown"),
      version: Number.isFinite(version) && version > 0 ? version : 1,
      source: String(headers["x-source"] || "unknown"),
      spec: "tourism-events/v1",
      timestamp: new Date().toISOString(),
      metadata: {
        correlationId: msg.properties.correlationId || crypto.randomUUID(),
        causationId: msg.properties.correlationId || crypto.randomUUID(),
        traceContext: {},
      },
      payload: rawContent,
    } as EventEnvelope
  }

  private async handleConsumerFailure(
    msg: ConsumeMessage,
    eventName: string,
    error: Error
  ): Promise<void> {
    const retryCount = this.getRetryCount(msg)

    if (retryCount >= this.getMaxRetries()) {
      await this.routeToDeadLetter(msg, eventName, error)
      return
    }

    recordRetry(eventName)
    await this.routeToRetry(msg, eventName, retryCount + 1, error)
  }

  private getRetryCount(msg: ConsumeMessage): number {
    const value = msg.properties.headers?.["x-retry-count"]

    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.floor(value)
    }

    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.floor(parsed)
      }
    }

    return 0
  }

  private async routeToRetry(
    msg: ConsumeMessage,
    eventName: string,
    retryCount: number,
    error: Error
  ): Promise<void> {
    const channel = this.connection.getChannel()
    if (!channel) {
      this.nack(msg, true)
      return
    }

    try {
      const originalRoutingKey =
        msg.properties.headers?.["x-original-routing-key"] || msg.fields.routingKey

      const headers = {
        ...(msg.properties.headers || {}),
        "x-original-routing-key": originalRoutingKey,
        "x-retry-count": retryCount,
        "x-last-error": error.message.slice(0, 500),
        "x-last-failure-at": new Date().toISOString(),
      }

      const retryExchange = this.getRetryExchangeName(originalRoutingKey)
      const retryRoutingKey = `${originalRoutingKey}.retry`

      await this.publishAndConfirm(channel, retryExchange, retryRoutingKey, msg.content, {
        persistent: true,
        contentType: msg.properties.contentType || "application/json",
        contentEncoding: msg.properties.contentEncoding,
        correlationId: msg.properties.correlationId,
        messageId: msg.properties.messageId,
        type: msg.properties.type,
        headers,
      })

      this.ack(msg)
    } catch (publishError) {
      const normalized = publishError instanceof Error ? publishError : new Error(String(publishError))
      this.nack(msg, true)
    }
  }

  private async routeToDeadLetter(
    msg: ConsumeMessage,
    eventName: string,
    error: Error
  ): Promise<void> {
    const channel = this.connection.getChannel()
    if (!channel) {
      this.nack(msg, false)
      return
    }

    try {
      const originalRoutingKey =
        msg.properties.headers?.["x-original-routing-key"] || msg.fields.routingKey

      const headers = {
        ...(msg.properties.headers || {}),
        "x-original-routing-key": originalRoutingKey,
        "x-retry-count": this.getRetryCount(msg),
        "x-last-error": error.message.slice(0, 500),
        "x-last-failure-at": new Date().toISOString(),
      }

      const dlqExchange = this.getDeadLetterExchangeName(originalRoutingKey)
      const dlqRoutingKey = `${originalRoutingKey}.dlq`

      await this.publishAndConfirm(channel, dlqExchange, dlqRoutingKey, msg.content, {
        persistent: true,
        contentType: msg.properties.contentType || "application/json",
        contentEncoding: msg.properties.contentEncoding,
        correlationId: msg.properties.correlationId,
        messageId: msg.properties.messageId,
        type: msg.properties.type,
        headers,
      })

      this.ack(msg)
      recordDeadLetter(eventName)
    } catch (publishError) {
      const normalized = publishError instanceof Error ? publishError : new Error(String(publishError))
      this.nack(msg, false)
    }
  }

  private getMaxRetries(): number {
    const value = Number(this.options.maxRetries ?? DEFAULT_MAX_RETRIES)
    if (Number.isFinite(value) && value >= 0) {
      return Math.floor(value)
    }
    return DEFAULT_MAX_RETRIES
  }

  private getRetryExchangeName(routingKey: string): string {
    const category = routingKey.split(".")[0]
    return `${EXCHANGE_MAP[category] || "tourism.integration"}.retry`
  }

  private getDeadLetterExchangeName(routingKey: string): string {
    const category = routingKey.split(".")[0]
    return `${EXCHANGE_MAP[category] || "tourism.integration"}.dlx`
  }
}
