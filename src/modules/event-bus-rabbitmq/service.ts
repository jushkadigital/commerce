import {
  AbstractEventBusModuleService,
  EventPriority,
  promiseAll,
  isPresent,
} from "@medusajs/framework/utils"
import type { Logger, InternalModuleDeclaration } from "@medusajs/framework/types"
import type { Channel, ChannelModel, ConfirmChannel, ConsumeMessage } from "amqplib"

type InjectedDependencies = {
  logger: Logger
}

export interface EventBusRabbitMQModuleOptions {
  rabbitmqUrl: string
  queuePrefix?: string
  prefetch?: number
  maxRetries?: number
  retryDelayMs?: number
}

type EmitData = {
  name: string
  data: unknown
  metadata?: Record<string, unknown>
  options?: {
    priority?: number
    attempts?: number
    internal?: boolean
  }
}

type SubscriberDescriptor = {
  id: string
  subscriber: (event: { name: string; data: unknown; metadata?: Record<string, unknown> }) => Promise<void>
}

const EXCHANGE_NAME = "medusa.events"
const DEFAULT_PREFETCH = 100
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY_MS = 30000

export default class RabbitMQEventBusService extends AbstractEventBusModuleService {
  protected logger_: Logger
  protected options_: EventBusRabbitMQModuleOptions
  protected connection_: ChannelModel | null = null
  protected channel_: ConfirmChannel | null = null
  protected isReady_ = false
  protected reconnectTimer_: NodeJS.Timeout | null = null
  protected consumers_ = new Map<string, string>()
  protected retryTimers_ = new Map<string, NodeJS.Timeout>()

  __hooks = {
    onApplicationStart: async () => {
      if (!this.isWorkerMode) {
        return
      }
      await this.connect()
      await this.startConsumer()
    },
    onApplicationShutdown: async () => {
      for (const [key, timer] of this.retryTimers_) {
        clearTimeout(timer)
      }
      this.retryTimers_.clear()
      await this.disconnect()
    },
    onApplicationPrepareShutdown: async () => {
      for (const [consumerTag, queueName] of this.consumers_) {
        try {
          await this.channel_?.cancel(consumerTag)
        } catch {
          // ignore
        }
      }
      this.consumers_.clear()
    },
  }

  constructor(
    { logger }: InjectedDependencies,
    moduleOptions: EventBusRabbitMQModuleOptions = { rabbitmqUrl: "" },
    moduleDeclaration?: InternalModuleDeclaration
  ) {
    // @ts-ignore - Medusa passes extra args internally
    super(...arguments)
    this.logger_ = logger
    this.options_ = moduleOptions
  }

  async emit(eventsData: EmitData | EmitData[], options: { groupedEventsTTL?: number; internal?: boolean } = {}): Promise<void> {
    let eventsDataArray = Array.isArray(eventsData) ? eventsData : [eventsData]

    const eventsToEmit = eventsDataArray.filter(
      (eventData) => !isPresent(eventData.metadata?.eventGroupId)
    )

    const eventsWithSubscribers = eventsToEmit.filter((eventData) => {
      const eventSubscribers = this.eventToSubscribersMap.get(eventData.name) || []
      const wildcardSubscribers = this.eventToSubscribersMap.get("*") || []
      return eventSubscribers.length || wildcardSubscribers.length
    })

    if (eventsWithSubscribers.length && this.isWorkerMode) {
      await this.ensureConnection()
      const channel = this.channel_!
      await this.declareExchange(channel)

      for (const eventData of eventsWithSubscribers) {
        this.callInterceptors(eventData, { isGrouped: false })

        const priority = eventData.options?.priority
          ?? options.internal
          ? EventPriority.LOWEST
          : EventPriority.DEFAULT

        const attempts = eventData.options?.attempts ?? 1

        const message = {
          name: eventData.name,
          data: eventData.data,
          metadata: eventData.metadata,
          options: {
            priority,
            attempts,
            internal: options.internal ?? false,
          },
        }

        const routingKey = `medusa.${eventData.name}`
        const buffer = Buffer.from(JSON.stringify(message))

        await new Promise<void>((resolve, reject) => {
          channel.publish(
            EXCHANGE_NAME,
            routingKey,
            buffer,
            {
              contentType: "application/json",
              persistent: true,
              mandatory: false,
              headers: {
                "x-event-name": eventData.name,
                "x-priority": String(priority),
                "x-attempts": String(attempts),
                "x-internal": String(!!options.internal),
              },
            },
            (err) => {
              if (err) {
                reject(err)
                return
              }
              resolve()
            }
          )
        })
      }
    }
  }

  async releaseGroupedEvents(eventGroupId: string): Promise<void> {
    this.logger_.warn(
      `[event-bus-rabbitmq] releaseGroupedEvents is not supported with RabbitMQ backend. eventGroupId=${eventGroupId}`
    )
  }

  async clearGroupedEvents(
    eventGroupId: string,
    _options?: { eventNames?: string[] }
  ): Promise<void> {
    this.logger_.warn(
      `[event-bus-rabbitmq] clearGroupedEvents is not supported with RabbitMQ backend. eventGroupId=${eventGroupId}`
    )
  }

  private async connect(): Promise<void> {
    const amqp = await import("amqplib")
    const url = this.options_.rabbitmqUrl

    if (!url) {
      this.logger_.warn("[event-bus-rabbitmq] No rabbitmqUrl configured, skipping connection")
      return
    }

    try {
      this.logger_.info("[event-bus-rabbitmq] Connecting to RabbitMQ...")
      this.connection_ = await amqp.connect(url)
      this.channel_ = await this.connection_.createConfirmChannel()

      await this.channel_.prefetch(this.options_.prefetch ?? DEFAULT_PREFETCH)

      this.isReady_ = true
      this.bindConnectionEvents()
      this.logger_.info("[event-bus-rabbitmq] Connected")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_.error(`[event-bus-rabbitmq] Connection failed: ${message}`)
      this.resetState()
      this.scheduleReconnect()
    }
  }

  private async ensureConnection(): Promise<void> {
    if (this.isReady_ && this.channel_) {
      return
    }
    await this.connect()
  }

  private bindConnectionEvents(): void {
    if (!this.connection_ || !this.channel_) return

    this.connection_.on("error", (err) => {
      this.logger_.error(`[event-bus-rabbitmq] Connection error: ${err.message}`)
      this.resetState()
      this.scheduleReconnect()
    })

    this.connection_.on("close", () => {
      this.logger_.warn("[event-bus-rabbitmq] Connection closed")
      this.resetState()
      this.scheduleReconnect()
    })

    this.channel_.on("error", (err) => {
      this.logger_.error(`[event-bus-rabbitmq] Channel error: ${err.message}`)
      this.channel_ = null
    })

    this.channel_.on("close", () => {
      if (!this.isReady_) return
      this.logger_.warn("[event-bus-rabbitmq] Channel closed")
      this.resetState()
      this.scheduleReconnect()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer_) return
    this.reconnectTimer_ = setTimeout(() => {
      this.reconnectTimer_ = null
      void this.connect().then(() => this.startConsumer())
    }, 5000)
  }

  private resetState(): void {
    this.isReady_ = false
    this.channel_ = null
    this.connection_ = null
  }

  private async disconnect(): Promise<void> {
    if (this.reconnectTimer_) {
      clearTimeout(this.reconnectTimer_)
      this.reconnectTimer_ = null
    }

    this.isReady_ = false

    try {
      await this.channel_?.close()
    } catch {
      // ignore
    }

    try {
      await this.connection_?.close()
    } catch {
      // ignore
    }

    this.channel_ = null
    this.connection_ = null
  }

  private async declareExchange(channel: ConfirmChannel): Promise<void> {
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true })
  }

  private async startConsumer(): Promise<void> {
    if (!this.channel_ || !this.isReady_) return

    const channel = this.channel_
    await this.declareExchange(channel)

    const queueName = `${this.options_.queuePrefix ?? "medusa"}-events`

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": `${EXCHANGE_NAME}.dlx`,
        "x-dead-letter-routing-key": "medusa.dead",
      },
    })

    const registeredEvents = Array.from(this.eventToSubscribersMap.keys())
    const routingBindings: Set<string> = new Set()

    for (const eventName of registeredEvents) {
      const routingKey = `medusa.${String(eventName)}`
      if (!routingBindings.has(routingKey)) {
        await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey)
        routingBindings.add(routingKey)
      }
    }

    const wildcardRoutingKey = "medusa.*"
    if (!routingBindings.has(wildcardRoutingKey)) {
      await channel.bindQueue(queueName, EXCHANGE_NAME, wildcardRoutingKey)
      routingBindings.add(wildcardRoutingKey)
    }

    if (this.consumers_.has(queueName)) return

    const { consumerTag } = await channel.consume(
      queueName,
      async (msg) => {
        if (!msg) return
        await this.handleMessage(msg)
      },
      { noAck: false }
    )

    this.consumers_.set(consumerTag, queueName)
    this.logger_.info(
      `[event-bus-rabbitmq] Consumer started: queue=${queueName} events=[${registeredEvents.join(", ")}]`
    )
  }

  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    const channel = this.channel_
    if (!channel) return

    const eventName =
      (msg.properties.headers?.["x-event-name"] as string) ??
      msg.fields.routingKey?.replace("medusa.", "") ??
      "unknown"

    const retryCount = this.getRetryCount(msg)

    try {
      const rawContent = JSON.parse(msg.content.toString())
      const event = {
        name: eventName,
        data: rawContent.data,
        metadata: rawContent.metadata,
      }

      const eventSubscribers: SubscriberDescriptor[] =
        this.eventToSubscribersMap.get(eventName) || []
      const wildcardSubscribers: SubscriberDescriptor[] =
        this.eventToSubscribersMap.get("*") || []
      const allSubscribers = eventSubscribers.concat(wildcardSubscribers)

      const completedSubscriberIds: string[] = rawContent.completedSubscriberIds || []
      const subscribersToProcess = allSubscribers.filter(
        (sub) => sub.id && !completedSubscriberIds.includes(sub.id)
      )

      if (subscribersToProcess.length === 0) {
        channel.ack(msg)
        return
      }

      const isRetry = retryCount > 0
      const configuredAttempts = Number(msg.properties.headers?.["x-attempts"] ?? 1)
      const isFinalAttempt = retryCount + 1 >= configuredAttempts

      if (isRetry) {
        this.logger_.info(
          `[event-bus-rabbitmq] Retrying ${eventName} (${retryCount + 1}/${configuredAttempts})`
        )
      } else {
        this.logger_.info(
          `[event-bus-rabbitmq] Processing ${eventName} with ${allSubscribers.length} subscriber(s)`
        )
      }

      const completedInThisAttempt: string[] = []
      const errors: Error[] = []

      await promiseAll(
        subscribersToProcess.map(async ({ id, subscriber }) => {
          try {
            await subscriber(event)
            completedInThisAttempt.push(id)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.logger_.warn(
              `[event-bus-rabbitmq] Subscriber ${id} failed for ${eventName}: ${message}`
            )
            errors.push(err instanceof Error ? err : new Error(message))
          }
        })
      )

      const hasFailures = completedInThisAttempt.length !== subscribersToProcess.length
      const shouldRetry = hasFailures && configuredAttempts > 1 && !isFinalAttempt

      if (shouldRetry) {
        const updatedCompleted = [...completedSubscriberIds, ...completedInThisAttempt]
        const retryBody = {
          ...rawContent,
          completedSubscriberIds: updatedCompleted,
        }

        const retryKey = `retry:${msg.properties.messageId || crypto.randomUUID()}`
        const delay = this.options_.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS

        const timer = setTimeout(() => {
          this.retryTimers_.delete(retryKey)
          void this.publishRetry(eventName, retryBody, configuredAttempts, retryCount + 1)
        }, delay)

        this.retryTimers_.set(retryKey, timer)
        channel.ack(msg)
        this.logger_.warn(
          `[event-bus-rabbitmq] ${eventName} failed. Retry scheduled in ${delay}ms (${retryCount + 1}/${configuredAttempts})`
        )
        return
      }

      if (hasFailures && isFinalAttempt) {
        this.logger_.error(
          `[event-bus-rabbitmq] ${eventName} final attempt failed. Moving to DLQ.`
        )
      }

      channel.ack(msg)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger_.error(`[event-bus-rabbitmq] Failed to process message: ${message}`)

      const maxRetries = this.options_.maxRetries ?? DEFAULT_MAX_RETRIES
      if (retryCount >= maxRetries) {
        channel.nack(msg, false, false)
      } else {
        channel.nack(msg, false, true)
      }
    }
  }

  private async publishRetry(
    eventName: string,
    body: Record<string, unknown>,
    configuredAttempts: number,
    retryCount: number
  ): Promise<void> {
    if (!this.channel_ || !this.isReady_) return

    const routingKey = `medusa.${eventName}`
    const buffer = Buffer.from(JSON.stringify(body))

    await new Promise<void>((resolve, reject) => {
      this.channel_!.publish(
        EXCHANGE_NAME,
        routingKey,
        buffer,
        {
          contentType: "application/json",
          persistent: true,
          headers: {
            "x-event-name": eventName,
            "x-attempts": String(configuredAttempts),
            "x-retry-count": String(retryCount),
          },
        },
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  private getRetryCount(msg: ConsumeMessage): number {
    const value = msg.properties.headers?.["x-retry-count"]
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.floor(value)
    }
    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed)
    }
    return 0
  }
}
