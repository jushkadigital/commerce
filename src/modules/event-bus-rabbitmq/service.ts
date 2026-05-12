import {
  EventBusTypes,
  IEventBusModuleService,
  InternalModuleDeclaration,
  Logger,
} from "@medusajs/types"
import { AbstractEventBusModuleService, Modules } from "@medusajs/utils"
import amqp from "amqplib"

const WHITELISTED_EVENTS = ["product.created", "product.updated"]
const DEFAULT_EXCHANGE = "tourism-exchange"
const DEFAULT_QUEUE_NAME = "medusa.main"
const DEFAULT_PREFETCH = 10
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY_MS = 15000
const SELF_ORIGIN = "medusa-backend"

type RabbitMQOptions = {
  url: string
  exchange?: string
  workerMode?: string
  queueName?: string
  queueType?: "classic" | "quorum"
  prefetch?: number
  maxRetries?: number
  retryDelayMs?: number
}

type InjectedDependencies = {
  logger: Logger
  [Modules.EVENT_BUS]?: IEventBusModuleService
}

type RabbitMQHeaders = Record<string, string | number | boolean>

export default class RabbitMQEventBusService extends AbstractEventBusModuleService {
  protected connection_: amqp.ChannelModel | null = null
  protected channel_: amqp.ConfirmChannel | null = null
  protected options_: RabbitMQOptions
  protected logger_: Logger
  protected isReady_ = false
  protected productModuleService_: any
  protected moduleDeclaration_: InternalModuleDeclaration
  protected medusaEventBus_: IEventBusModuleService | null = null
  protected cradle_: InjectedDependencies
  protected stagedEvents_: Map<string, EventBusTypes.Message<unknown>[]> = new Map()
  protected reconnectTimer_: NodeJS.Timeout | null = null
  protected connectPromise_: Promise<void> | null = null

  constructor(
    cradle: InjectedDependencies,
    moduleOptions: RabbitMQOptions,
    moduleDeclaration: InternalModuleDeclaration
  ) {
    super(cradle, moduleOptions, moduleDeclaration)

    this.cradle_ = cradle
    this.logger_ = cradle.logger
    this.options_ = moduleOptions
    this.moduleDeclaration_ = moduleDeclaration

    const eventBus = cradle[Modules.EVENT_BUS]
    if (eventBus) {
      this.medusaEventBus_ = eventBus
    }

    void this.connect()
  }

  private getMedusaEventBus(): IEventBusModuleService | null {
    if (this.medusaEventBus_) {
      return this.medusaEventBus_
    }

    const eventBus = this.cradle_[Modules.EVENT_BUS]
    if (eventBus) {
      this.medusaEventBus_ = eventBus
    }

    return this.medusaEventBus_
  }

  private getExchangeName(): string {
    return this.options_.exchange || DEFAULT_EXCHANGE
  }

  private getRetryExchangeName(): string {
    return `${this.getExchangeName()}.retry`
  }

  private getDeadLetterExchangeName(): string {
    return `${this.getExchangeName()}.dlx`
  }

  private getQueueName(): string {
    return this.options_.queueName || DEFAULT_QUEUE_NAME
  }

  private getRetryQueueName(): string {
    return `${this.getQueueName()}.retry`
  }

  private getDeadLetterQueueName(): string {
    return `${this.getQueueName()}.dlq`
  }

  private getRetryRoutingKey(): string {
    return `${this.getQueueName()}.retry`
  }

  private getDeadLetterRoutingKey(): string {
    return `${this.getQueueName()}.dlq`
  }

  private getPrefetch(): number {
    const value = Number(this.options_.prefetch ?? DEFAULT_PREFETCH)

    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value)
    }

    return DEFAULT_PREFETCH
  }

  private getMaxRetries(): number {
    const value = Number(this.options_.maxRetries ?? DEFAULT_MAX_RETRIES)

    if (Number.isFinite(value) && value >= 0) {
      return Math.floor(value)
    }

    return DEFAULT_MAX_RETRIES
  }

  private getRetryDelayMs(): number {
    const value = Number(this.options_.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS)

    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value)
    }

    return DEFAULT_RETRY_DELAY_MS
  }

  private getQueueType(): "classic" | "quorum" {
    return this.options_.queueType === "classic" ? "classic" : "quorum"
  }

  private buildQueueArguments(): Record<string, string> {
    return {
      "x-queue-type": this.getQueueType(),
    }
  }

  private isPreconditionFailure(error: unknown): error is { code: number; message: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "message" in error &&
      (error as { code: number }).code === 406 &&
      String((error as { message: string }).message).includes("PRECONDITION_FAILED")
    )
  }

  private async ensureQueue(
    name: string,
    options: amqp.Options.AssertQueue
  ): Promise<void> {
    if (!this.channel_) {
      throw new Error("RabbitMQ channel not available")
    }

    try {
      await this.channel_.assertQueue(name, options)
    } catch (error) {
      if (!this.isPreconditionFailure(error)) {
        throw error
      }

      this.logger_.warn(
        `Queue ${name} already exists with different arguments in RabbitMQ. Reusing existing queue instead of redeclaring it.`
      )
      await this.channel_.checkQueue(name)
    }
  }

  private shouldConsumeMessages(): boolean {
    return this.options_.workerMode === "shared" || this.options_.workerMode === "worker"
  }

  private scheduleReconnect(delay = 5000): void {
    if (this.reconnectTimer_) {
      return
    }

    this.reconnectTimer_ = setTimeout(() => {
      this.reconnectTimer_ = null
      void this.connect(Infinity, delay)
    }, delay)
  }

  private async safeCloseChannel(): Promise<void> {
    if (!this.channel_) {
      return
    }

    const channel = this.channel_
    this.channel_ = null

    try {
      await channel.close()
    } catch {}
  }

  private async safeCloseConnection(): Promise<void> {
    if (!this.connection_) {
      return
    }

    const connection = this.connection_
    this.connection_ = null

    try {
      await connection.close()
    } catch {}
  }

  private async resetRuntimeState(): Promise<void> {
    this.isReady_ = false
    await this.safeCloseChannel()
    await this.safeCloseConnection()
  }

  private bindConnectionLifecycle(delay: number): void {
    if (!this.connection_ || !this.channel_) {
      return
    }

    this.connection_.on("error", (err) => {
      this.logger_.error(`RabbitMQ connection error: ${err.message}`)
      void this.resetRuntimeState()
      this.scheduleReconnect(delay)
    })

    this.connection_.on("close", () => {
      this.logger_.warn("RabbitMQ connection closed. Attempting to reconnect...")
      void this.resetRuntimeState()
      this.scheduleReconnect(delay)
    })

    this.channel_.on("error", (err) => {
      this.logger_.error(`RabbitMQ channel error: ${err.message}`)
      void this.resetRuntimeState()
      this.scheduleReconnect(delay)
    })

    this.channel_.on("close", () => {
      if (!this.isReady_) {
        return
      }

      this.logger_.warn("RabbitMQ channel closed. Attempting to reconnect...")
      void this.resetRuntimeState()
      this.scheduleReconnect(delay)
    })
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel_) {
      throw new Error("RabbitMQ channel not available")
    }

    const exchange = this.getExchangeName()
    const retryExchange = this.getRetryExchangeName()
    const deadLetterExchange = this.getDeadLetterExchangeName()
    const queueName = this.getQueueName()
    const retryQueueName = this.getRetryQueueName()
    const deadLetterQueueName = this.getDeadLetterQueueName()

    await this.channel_.assertExchange(exchange, "topic", { durable: true })
    await this.channel_.assertExchange(retryExchange, "direct", { durable: true })
    await this.channel_.assertExchange(deadLetterExchange, "direct", { durable: true })

    await this.ensureQueue(queueName, {
      durable: true,
      deadLetterExchange,
      deadLetterRoutingKey: this.getDeadLetterRoutingKey(),
      arguments: this.buildQueueArguments(),
    })

    await this.ensureQueue(retryQueueName, {
      durable: true,
      messageTtl: this.getRetryDelayMs(),
      deadLetterExchange: exchange,
      deadLetterRoutingKey: "#",
      arguments: this.buildQueueArguments(),
    })

    await this.ensureQueue(deadLetterQueueName, {
      durable: true,
      arguments: this.buildQueueArguments(),
    })

    await this.channel_.bindQueue(queueName, exchange, "#")
    await this.channel_.bindQueue(retryQueueName, retryExchange, this.getRetryRoutingKey())
    await this.channel_.bindQueue(deadLetterQueueName, deadLetterExchange, this.getDeadLetterRoutingKey())

    this.logger_.info(
      `RabbitMQ topology ready. queue=${queueName} retry=${retryQueueName} dlq=${deadLetterQueueName} queueType=${this.getQueueType()} maxRetries=${this.getMaxRetries()} retryDelayMs=${this.getRetryDelayMs()}`
    )
  }

  async connect(retries = Infinity, delay = 5000): Promise<void> {
    if (this.connectPromise_) {
      return this.connectPromise_
    }

    this.connectPromise_ = this.connectInternal(retries, delay).finally(() => {
      this.connectPromise_ = null
    })

    return this.connectPromise_
  }

  private async connectInternal(retries: number, delay: number): Promise<void> {
    if (this.isReady_) {
      return
    }

    let attempt = 0

    while (!this.isReady_ && attempt < retries) {
      attempt += 1

      try {
        this.logger_.info(`Connecting to RabbitMQ... (Attempt ${attempt}/${retries === Infinity ? "inf" : retries})`)

        this.connection_ = await amqp.connect(this.options_.url)
        this.channel_ = await this.connection_.createConfirmChannel()

        await this.setupTopology()

        if (this.shouldConsumeMessages()) {
          await this.startConsumer()
          this.logger_.info(`Conectado a RabbitMQ. Cola principal: ${this.getQueueName()}`)
        } else {
          this.logger_.info("RabbitMQ in server mode - consumer disabled")
        }

        this.isReady_ = true
        this.bindConnectionLifecycle(delay)
        this.logger_.info("RabbitMQ Event Bus is ready.")
        return
      } catch (err: any) {
        this.logger_.error(`Failed to connect to RabbitMQ: ${err.message}`)
        await this.resetRuntimeState()

        if (attempt >= retries) {
          this.logger_.error(
            "All RabbitMQ connection retries failed. System will keep retrying in the background."
          )
          this.scheduleReconnect(delay)
          return
        }

        this.logger_.info(`Retrying in ${delay / 1000} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  private async startConsumer(): Promise<void> {
    if (!this.channel_) {
      throw new Error("RabbitMQ channel not available")
    }

    await this.channel_.prefetch(this.getPrefetch())

    await this.channel_.consume(
      this.getQueueName(),
      async (msg) => {
        if (!msg) {
          return
        }

        await this.handleConsumedMessage(msg)
      },
      { noAck: false }
    )
  }

  private getRetryCount(msg: amqp.ConsumeMessage): number {
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

  private getEventName(msg: amqp.ConsumeMessage): string {
    const originalRoutingKey = msg.properties.headers?.["x-original-routing-key"]

    if (typeof originalRoutingKey === "string" && originalRoutingKey.length > 0) {
      return originalRoutingKey
    }

    return msg.fields.routingKey
  }

  private isSelfProducedMessage(msg: amqp.ConsumeMessage): boolean {
    return msg.properties.headers?.["x-origin-service"] === SELF_ORIGIN
  }

  private buildHeaders(
    msg: amqp.ConsumeMessage,
    eventName: string,
    retryCount: number,
    error?: Error
  ): RabbitMQHeaders {
    const headers: RabbitMQHeaders = {
      ...(msg.properties.headers as RabbitMQHeaders | undefined),
      "x-original-routing-key": eventName,
      "x-retry-count": retryCount,
    }

    if (error) {
      headers["x-last-error"] = error.message.slice(0, 500)
      headers["x-last-failure-at"] = new Date().toISOString()
    }

    return headers
  }

  private async publishWithConfirm(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: amqp.Options.Publish
  ): Promise<void> {
    if (!this.channel_) {
      throw new Error("RabbitMQ channel not available")
    }

    await new Promise<void>((resolve, reject) => {
      this.channel_?.publish(exchange, routingKey, content, options, (err) => {
        if (err) {
          reject(err)
          return
        }

        resolve()
      })
    })
  }

  private ackMessage(msg: amqp.ConsumeMessage): void {
    this.channel_?.ack(msg)
  }

  private nackMessage(msg: amqp.ConsumeMessage, requeue: boolean): void {
    this.channel_?.nack(msg, false, requeue)
  }

  private async routeToRetry(
    msg: amqp.ConsumeMessage,
    eventName: string,
    retryCount: number,
    error: Error
  ): Promise<void> {
    try {
      await this.publishWithConfirm(this.getRetryExchangeName(), this.getRetryRoutingKey(), msg.content, {
        persistent: true,
        contentType: msg.properties.contentType || "application/json",
        contentEncoding: msg.properties.contentEncoding,
        correlationId: msg.properties.correlationId,
        messageId: msg.properties.messageId,
        type: msg.properties.type,
        headers: this.buildHeaders(msg, eventName, retryCount, error),
      })

      this.ackMessage(msg)
      this.logger_.warn(
        `RabbitMQ event ${eventName} failed. Sent to retry queue (${retryCount}/${this.getMaxRetries()}).`
      )
    } catch (publishError: any) {
      this.logger_.error(
        `Failed to publish retry for ${eventName}: ${publishError?.message || publishError}`
      )
      this.nackMessage(msg, true)
    }
  }

  private async routeToDeadLetter(
    msg: amqp.ConsumeMessage,
    eventName: string,
    error: Error
  ): Promise<void> {
    try {
      await this.publishWithConfirm(
        this.getDeadLetterExchangeName(),
        this.getDeadLetterRoutingKey(),
        msg.content,
        {
          persistent: true,
          contentType: msg.properties.contentType || "application/json",
          contentEncoding: msg.properties.contentEncoding,
          correlationId: msg.properties.correlationId,
          messageId: msg.properties.messageId,
          type: msg.properties.type,
          headers: this.buildHeaders(msg, eventName, this.getRetryCount(msg), error),
        }
      )

      this.ackMessage(msg)
      this.logger_.error(`RabbitMQ event ${eventName} moved to DLQ: ${error.message}`)
    } catch (publishError: any) {
      this.logger_.error(
        `Failed to publish DLQ message for ${eventName}: ${publishError?.message || publishError}`
      )
      this.nackMessage(msg, false)
    }
  }

  private async handleConsumerFailure(
    msg: amqp.ConsumeMessage,
    eventName: string,
    error: Error
  ): Promise<void> {
    const currentRetryCount = this.getRetryCount(msg)

    if (currentRetryCount >= this.getMaxRetries()) {
      await this.routeToDeadLetter(msg, eventName, error)
      return
    }

    await this.routeToRetry(msg, eventName, currentRetryCount + 1, error)
  }

  private buildInboundMessage(
    msg: amqp.ConsumeMessage,
    eventName: string,
    rawContent: unknown
  ): EventBusTypes.Message<unknown> {
    return {
      name: eventName,
      data: rawContent,
      metadata: {
        event_id: msg.properties.messageId,
        correlation_id: msg.properties.correlationId,
        source: "rabbitmq",
        timestamp: new Date().toISOString(),
      },
      options: msg.properties.headers,
    }
  }

  private getLocalSubscribers(eventName: string): EventBusTypes.SubscriberDescriptor[] {
    const specificSubs = this.eventToSubscribersMap_.get(eventName) || []
    const wildcardSubs = this.eventToSubscribersMap_.get("*") || []
    return [...specificSubs, ...wildcardSubs]
  }

  private async dispatchInboundMessage(message: EventBusTypes.Message<unknown>): Promise<void> {
    const subscribers = this.getLocalSubscribers(message.name)

    if (subscribers.length) {
      await Promise.all(
        subscribers.map(async (descriptor) => {
          await descriptor.subscriber(message)
        })
      )

      return
    }

    const eventBus = this.getMedusaEventBus()
    if (!eventBus) {
      throw new Error(`No Medusa Event Bus available for RabbitMQ event ${message.name}`)
    }

    await eventBus.emit(message)
  }

  private async handleConsumedMessage(msg: amqp.ConsumeMessage): Promise<void> {
    const eventName = this.getEventName(msg)

    if (this.isSelfProducedMessage(msg)) {
      this.ackMessage(msg)
      this.logger_.info(`Skipping self-produced RabbitMQ event: ${eventName}`)
      return
    }

    let rawContent: unknown

    try {
      rawContent = JSON.parse(msg.content.toString())
    } catch (error) {
      const parseError = error instanceof Error ? error : new Error(String(error))
      await this.routeToDeadLetter(msg, eventName, parseError)
      return
    }

    const message = this.buildInboundMessage(msg, eventName, rawContent)

    try {
      if (typeof this.callInterceptors === "function") {
        await this.callInterceptors(message, { isGrouped: false })
      }

      await this.dispatchInboundMessage(message)
      this.ackMessage(msg)
      this.logger_.info(`Processed RabbitMQ event: ${eventName}`)
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      await this.handleConsumerFailure(msg, eventName, normalizedError)
    }
  }

  private async enrichProductEvent(
    event: EventBusTypes.Message<any>
  ): Promise<EventBusTypes.Message<any>> {
    if (!WHITELISTED_EVENTS.includes(event.name)) {
      return event
    }

    const productId = event.data?.id || event.data

    if (!productId || typeof productId !== "string") {
      this.logger_.warn(`Product event ${event.name} missing valid product ID`)
      return event
    }

    try {
      if (!this.productModuleService_) {
        const container = (this.moduleDeclaration_ as any)?.scope?.cradle

        if (container?.productModuleService) {
          this.productModuleService_ = container.productModuleService
        } else {
          this.logger_.warn("Cannot resolve product module service - container not available")
          return event
        }
      }

      const product = await this.productModuleService_.retrieve(productId, {
        relations: ["variants", "images", "tags", "categories"],
      })

      return {
        ...event,
        data: product,
        metadata: {
          ...event.metadata,
          enriched: true,
          original_data: event.data,
        },
      }
    } catch (err) {
      this.logger_.error(`Failed to enrich product event ${event.name}: ${err}`)
      return event
    }
  }

  subscribe(
    eventName: string | symbol,
    subscriber: EventBusTypes.Subscriber,
    context?: EventBusTypes.SubscriberContext
  ): this {
    super.subscribe(eventName, subscriber, context)
    return this
  }

  async emit<T>(
    data: EventBusTypes.Message<T> | EventBusTypes.Message<T>[],
    options: Record<string, unknown> = {}
  ): Promise<void> {
    const events = Array.isArray(data) ? data : [data]
    const groupId = options.eventGroupId as string | undefined

    if (groupId) {
      const existing = this.stagedEvents_.get(groupId) || []
      this.stagedEvents_.set(groupId, [...existing, ...events])
      return
    }

    await this.publishEvents(events)
  }

  async releaseGroupedEvents(eventGroupId: string): Promise<void> {
    const events = this.stagedEvents_.get(eventGroupId)

    if (!events) {
      return
    }

    await this.publishEvents(events)
    this.stagedEvents_.delete(eventGroupId)
  }

  async clearGroupedEvents(
    eventGroupId: string,
    options?: { eventNames?: string[] }
  ): Promise<void> {
    if (!this.stagedEvents_.has(eventGroupId)) {
      return
    }

    if (!options?.eventNames) {
      this.stagedEvents_.delete(eventGroupId)
      return
    }

    const events = this.stagedEvents_.get(eventGroupId) || []
    const filteredEvents = events.filter((event) => !options.eventNames?.includes(event.name))

    if (filteredEvents.length === 0) {
      this.stagedEvents_.delete(eventGroupId)
      return
    }

    this.stagedEvents_.set(eventGroupId, filteredEvents)
  }

  private async publishEvents(events: EventBusTypes.Message<unknown>[]): Promise<void> {
    if (!this.isReady_) {
      throw new Error("RabbitMQ not ready")
    }

    for (const event of events) {
      if (!WHITELISTED_EVENTS.includes(event.name)) {
        continue
      }

      const enrichedEvent = await this.enrichProductEvent(event)
      const buffer = Buffer.from(JSON.stringify(enrichedEvent.data))

      await this.publishWithConfirm(this.getExchangeName(), enrichedEvent.name, buffer, {
        persistent: true,
        contentType: "application/json",
        correlationId:
          typeof enrichedEvent.metadata?.correlation_id === "string"
            ? enrichedEvent.metadata.correlation_id
            : undefined,
        messageId:
          typeof enrichedEvent.metadata?.event_id === "string"
            ? enrichedEvent.metadata.event_id
            : undefined,
        type: enrichedEvent.name,
        headers: {
          ...(enrichedEvent.options as RabbitMQHeaders | undefined),
          source: typeof enrichedEvent.metadata?.source === "string"
            ? enrichedEvent.metadata.source
            : "medusa",
          "x-origin-service": SELF_ORIGIN,
        },
      })
    }
  }
}
