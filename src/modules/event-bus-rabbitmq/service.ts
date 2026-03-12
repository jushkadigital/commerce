// src/modules/event-bus-rabbitmq/service.ts
import {
  InternalModuleDeclaration,
  EventBusTypes,
  Logger,
  IEventBusModuleService
} from "@medusajs/types"
import { AbstractEventBusModuleService, Modules } from "@medusajs/utils"
import amqp from "amqplib"

const WHITELISTED_EVENTS = ["product.created", "product.updated"]

type RabbitMQOptions = {
  url: string
  exchange?: string
  workerMode?: string
}

type InjectedDependencies = {
  logger: Logger
  [Modules.EVENT_BUS]?: IEventBusModuleService
}

export default class RabbitMQEventBusService extends AbstractEventBusModuleService {
  protected connection_: amqp.ChannelModel
  protected channel_: amqp.Channel
  protected options_: RabbitMQOptions
  protected logger_: Logger
  protected isReady_: boolean = false
  protected queueName_: string = ""
  protected pendingBindings_: Map<string, string> = new Map()
  protected productModuleService_: any
  protected moduleDeclaration_: InternalModuleDeclaration
  protected medusaEventBus_: IEventBusModuleService | null = null
  protected cradle_: InjectedDependencies

  protected stagedEvents_: Map<string, EventBusTypes.Message<unknown>[]> = new Map()

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
      this.logger_.info("Medusa Event Bus injected via constructor")
    } else {
      this.logger_.warn("Medusa Event Bus not available at construction, will resolve lazily")
    }

    this.connect()
  }

  private getMedusaEventBus(): IEventBusModuleService | null {
    if (this.medusaEventBus_) return this.medusaEventBus_

    const eventBus = this.cradle_[Modules.EVENT_BUS]
    if (eventBus) {
      this.medusaEventBus_ = eventBus
      this.logger_.info("Medusa Event Bus resolved lazily")
    }
    return this.medusaEventBus_
  }

  async connect(retries = 5, delay = 5000) {
    if (this.isReady_) return

    for (let i = 0; i < retries; i++) {
      try {
        this.logger_.info(`Connecting to RabbitMQ... (Attempt ${i + 1}/${retries})`)
        this.connection_ = await amqp.connect(this.options_.url)
        this.channel_ = await this.connection_.createChannel()

        this.logger_.info("🟢 [DEBUG] ONE")
        const exchange = this.options_.exchange || "tourism-exchange"
        // Usamos 'topic' para permitir routing keys flexibles
        await this.channel_.assertExchange(exchange, "topic", { durable: true })

        const isWorker = this.options_.workerMode === "shared" || this.options_.workerMode === "worker"

        if (isWorker) {
          // Crear cola exclusiva para esta instancia de Medusa
          const q = await this.channel_.assertQueue("commerce_sync_queue", { durable: true })
          this.queueName_ = q.queue

          // Binding wildcard para recibir TODOS los eventos del exchange
          await this.channel_.bindQueue(this.queueName_, exchange, "#")
          this.logger_.info(`Queue bound to exchange "${exchange}" with routing key "#"`)

          // Consumidor: Escucha mensajes de RabbitMQ e invoca suscriptores locales
          this.channel_.consume(q.queue, async (msg) => {
            if (!msg) return

            const routingKey = msg.fields.routingKey
            let rawContent: any

            try {
              rawContent = JSON.parse(msg.content.toString())
            } catch (err) {
              this.logger_.error(`Failed to parse message content: ${err}`)
              return
            }

            // 1. CONSTRUCCIÓN ESTRICTA DEL MENSAJE TIPO MEDUSA
            const message: EventBusTypes.Message<unknown> = {
              name: routingKey,
              data: rawContent,
              metadata: {
                event_id: msg.properties.messageId,
                correlation_id: msg.properties.correlationId,
                source: "rabbitmq",
                timestamp: new Date().toISOString()
              },
              options: msg.properties.headers
            }

            this.logger_.info("🟢 [DEBUG] Mensaje crudo recibido en RabbitMQ Service")

            // A. Call interceptors (if available)
            if (typeof this.callInterceptors === 'function') {
              try {
                await this.callInterceptors(message, { isGrouped: false })
              } catch (err) {
                this.logger_.warn(`Interceptor failed for ${routingKey}: ${err}`)
              }
            }

            // B. Lookup subscribers (specific + wildcard)
            const specificSubs = this.eventToSubscribersMap_.get(routingKey) || []
            const wildcardSubs = this.eventToSubscribersMap_.get("*") || []
            const allSubscribers = [...specificSubs, ...wildcardSubs]

            // C. Execute all subscribers
            await Promise.all(
              allSubscribers.map(async (subDescriptor) => {
                try {
                  await subDescriptor.subscriber(message)
                } catch (err) {
                  this.logger_.error(
                    `Error processing ${routingKey} in RabbitMQ subscriber: ${err}`
                  )
                }
              })
            )

            // D. Re-emit to Medusa's official Event Bus
            const eventBus = this.getMedusaEventBus()
            if (eventBus) {
              try {
                await eventBus.emit(message)
                this.logger_.info(`Re-emitted ${routingKey} to Medusa Event Bus`)
              } catch (err) {
                this.logger_.error(`Failed to re-emit ${routingKey} to Medusa Event Bus: ${err}`)
              }
            } else {
              this.logger_.warn(`Medusa Event Bus not available, cannot re-emit ${routingKey}`)
            }
          }, { noAck: true })

          // Process pending bindings
          for (const [eventName, routingKey] of this.pendingBindings_.entries()) {
            await this.channel_.bindQueue(this.queueName_, exchange, routingKey)
          }
          this.pendingBindings_.clear()
          
          this.logger_.info(`Conectado a RabbitMQ. Cola: ${this.queueName_}`)
        } else {
          this.logger_.info("RabbitMQ in server mode - skipping consumer initialization")
          this.pendingBindings_.clear()
        }

        this.isReady_ = true

        this.logger_.info("RabbitMQ Event Bus is ready.")
        
        // Manejo de desconexiones inesperadas (reconexión automática)
        this.connection_.on("error", (err) => {
          this.logger_.error(`RabbitMQ connection error: ${err.message}`)
          this.isReady_ = false
          setTimeout(() => this.connect(), delay)
        })

        this.connection_.on("close", () => {
          this.logger_.warn(`RabbitMQ connection closed. Attempting to reconnect...`)
          this.isReady_ = false
          setTimeout(() => this.connect(), delay)
        })

        return // Conexión exitosa, salimos del loop de reintentos

      } catch (err: any) {
        this.logger_.error(`Failed to connect to RabbitMQ: ${err.message}`)
        if (i < retries - 1) {
          this.logger_.info(`Retrying in ${delay / 1000} seconds...`)
          await new Promise(res => setTimeout(res, delay))
        } else {
          this.logger_.error(`All RabbitMQ connection retries failed. System will run without external event publishing.`)
        }
      }
    }
  }

  // --- IMPLEMENTACIÓN DE MÉTODOS ABSTRACTOS ---

  private async enrichProductEvent(event: EventBusTypes.Message<any>): Promise<EventBusTypes.Message<any>> {
    if (!['product.created', 'product.updated'].includes(event.name)) {
      return event
    }

    const productId = event.data?.id || event.data

    if (!productId || typeof productId !== 'string') {
      this.logger_.warn(`Product event ${event.name} missing valid product ID`)
      return event
    }

    try {
      if (!this.productModuleService_) {
        const container = (this.moduleDeclaration_ as any)?.scope?.cradle

        if (container?.productModuleService) {
          this.productModuleService_ = container.productModuleService
        } else {
          this.logger_.warn('Cannot resolve product module service - container not available')
          return event
        }
      }

      const product = await this.productModuleService_.retrieve(productId, {
        relations: ['variants', 'images', 'tags', 'categories']
      })

      return {
        ...event,
        data: product,
        metadata: {
          ...event.metadata,
          enriched: true,
          original_data: event.data
        }
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
    // A. Registro interno en Medusa
    super.subscribe(eventName, subscriber, context)

    this.logger_.info("SUBS")
    this.logger_.info(`${this.isReady_}`)

    // B. Si RabbitMQ ya está listo, creamos el binding inmediatamente
    const isWorker = this.options_.workerMode === "shared" || this.options_.workerMode === "worker"
    
    if (isWorker) {
      if (this.isReady_ && this.queueName_ && typeof eventName === 'string') {
        const exchange = this.options_.exchange || "tourism-exchange"
        this.channel_.bindQueue(this.queueName_, exchange, eventName)
          .catch(err => this.logger_.error(`Error binding queue for ${eventName}: ${err}`))
      } else if (!this.isReady_ && typeof eventName === 'string') {
        // Store for later binding when connection is ready
        this.pendingBindings_.set(eventName, eventName)
      }
    }

    return this
  }

  async emit<T>(
    data: EventBusTypes.Message<T> | EventBusTypes.Message<T>[],
    options: Record<string, unknown> = {}
  ): Promise<void> {
    const events = Array.isArray(data) ? data : [data]

    // 1. Grouped events: Stage only
    const groupId = options.eventGroupId as string
    if (groupId) {
      const existing = this.stagedEvents_.get(groupId) || []
      this.stagedEvents_.set(groupId, [...existing, ...events])
      return
    }

    // 2. Non-grouped: Execute locally + publish if whitelisted
    for (const event of events) {
      // A. Call interceptors
      if (typeof this.callInterceptors === 'function') {
        try {
          await this.callInterceptors(event, { isGrouped: false })
        } catch (err) {
          this.logger_.warn(`Interceptor failed for ${event.name}: ${err}`)
        }
      }

      // B. Execute local subscribers (specific + wildcard)
      const specificSubs = this.eventToSubscribersMap_.get(event.name) || []
      const wildcardSubs = this.eventToSubscribersMap_.get("*") || []
      const allSubscribers = [...specificSubs, ...wildcardSubs]

      await Promise.all(
        allSubscribers.map(async (subDescriptor) => {
          try {
            await subDescriptor.subscriber(event)
          } catch (err) {
            this.logger_.error(`Error in local subscriber for ${event.name}: ${err}`)
          }
        })
      )

      // C. Publish to RabbitMQ if whitelisted
      if (WHITELISTED_EVENTS.includes(event.name)) {
        await this.publishEvents([event])
      }
    }
  }

  async releaseGroupedEvents(eventGroupId: string): Promise<void> {
    const events = this.stagedEvents_.get(eventGroupId)
    if (!events) return

    // Enviamos todos los eventos acumulados
    await this.publishEvents(events)

    // Limpiamos la memoria
    this.stagedEvents_.delete(eventGroupId)
  }

  async clearGroupedEvents(
    eventGroupId: string,
    options?: { eventNames?: string[] }
  ): Promise<void> {
    if (!this.stagedEvents_.has(eventGroupId)) return

    if (!options?.eventNames) {
      // Borrar todo el grupo
      this.stagedEvents_.delete(eventGroupId)
      return
    }

    // Borrar solo ciertos eventos del grupo
    const events = this.stagedEvents_.get(eventGroupId) || []
    const filteredEvents = events.filter(
      (e) => !options.eventNames?.includes(e.name)
    )

    if (filteredEvents.length === 0) {
      this.stagedEvents_.delete(eventGroupId)
    } else {
      this.stagedEvents_.set(eventGroupId, filteredEvents)
    }
  }

  // Helper privado para publicar en RabbitMQ
  private async publishEvents(events: EventBusTypes.Message<unknown>[]) {
    if (!this.isReady_) {
      this.logger_.warn("RabbitMQ not ready, skipping publish")
      return
    }

    const exchange = this.options_.exchange || "tourism-exchange"

    // Interceptores (opcional, pero buena práctica llamar a la clase padre)
    // await Promise.all(events.map(e => this.callInterceptors(e)))

    for (const event of events) {
      try {
        const enrichedEvent = await this.enrichProductEvent(event)

        const buffer = Buffer.from(JSON.stringify(enrichedEvent))
        this.channel_.publish(exchange, enrichedEvent.name, buffer)
      } catch (err) {
        this.logger_.error(`Error publishing event ${event.name}: ${err}`)
      }
    }
  }

  // Sobrescribir subscribe para hacer binding en RabbitMQ si es necesario
  // Nota: En arquitecturas topic, a veces es mejor hacer bind de "*" o manejarlo dinámicamente.
  // Por simplicidad, aquí asumimos que escuchas todo o configuras bindings manuales.
}
