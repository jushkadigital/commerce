// src/modules/event-bus-rabbitmq/service.ts
import {
  InternalModuleDeclaration,
  EventBusTypes,
  Logger
} from "@medusajs/types"
import { AbstractEventBusModuleService } from "@medusajs/utils" // O desde donde importes la clase base
import amqp, { Connection, Channel } from "amqplib"

type RabbitMQOptions = {
  url: string
  exchange?: string
}

type InjectedDependencies = {
  logger: Logger
}

export default class RabbitMQEventBusService extends AbstractEventBusModuleService {
  protected connection_: Connection
  protected channel_: Channel
  protected options_: RabbitMQOptions
  protected logger_: Logger
  protected isReady_: boolean = false
  protected queueName_: string = "" // <--- NUEVA PROPIEDAD

  // Almacén temporal para eventos agrupados (Transacciones)
  protected stagedEvents_: Map<string, EventBusTypes.Message<unknown>[]> = new Map()

  constructor(
    { logger }: InjectedDependencies,
    moduleOptions: RabbitMQOptions,
    moduleDeclaration: InternalModuleDeclaration
  ) {
    // 1. Llamamos al constructor padre con los argumentos exactos que requiere
    super({}, moduleOptions, moduleDeclaration)

    this.logger_ = logger
    this.options_ = moduleOptions

    // Iniciamos conexión
    this.connect()
  }

  async connect() {
    if (this.isReady_) return

    try {
      this.logger_.info("Connecting to RabbitMQ...")
      this.connection_ = await amqp.connect(this.options_.url) as unknown as Connection
      this.channel_ = await this.connection_.createChannel()

      this.logger_.info("🟢 [DEBUG] ONE")
      const exchange = this.options_.exchange || "tourism-exchange"
      // Usamos 'topic' para permitir routing keys flexibles
      await this.channel_.assertExchange(exchange, "topic", { durable: true })

      // Crear cola exclusiva para esta instancia de Medusa
      const q = await this.channel_.assertQueue("", { exclusive: true })
      this.queueName_ = q.queue



      // Consumidor: Escucha mensajes de RabbitMQ e invoca suscriptores locales
      this.channel_.consume(q.queue, async (msg) => {
        if (!msg) return

        const routingKey = msg.fields.routingKey
        const rawContent = JSON.parse(msg.content.toString())

        // 1. CONSTRUCCIÓN ESTRICTA DEL MENSAJE TIPO MEDUSA
        // Convertimos lo que llega de RabbitMQ en la estructura Message<T>
        // Asumimos que rawContent es el PAYLOAD (la data útil)

        const message: EventBusTypes.Message<unknown> = {
          // 'name' es obligatorio según tu tipo
          name: routingKey,

          // 'data' es el payload. 
          // NOTA: Si tu sistema externo envía ya el wrapper {data: ...}, 
          // deberías hacer: rawContent.data || rawContent
          data: rawContent,

          // 'metadata' es opcional, pero útil llenarlo con info de Rabbit
          metadata: {
            event_id: msg.properties.messageId,
            correlation_id: msg.properties.correlationId,
            source: "rabbitmq",
            timestamp: new Date().toISOString()
          },

          // 'options' viene de la extensión de Message
          options: msg.properties.headers
        }

        this.logger_.info("🟢 [DEBUG] Mensaje crudo recibido en RabbitMQ Service")
        // Buscamos suscriptores locales en el mapa de la clase padre
        const subscribers = this.eventToSubscribersMap_.get(routingKey) || []

        await Promise.all(
          subscribers.map(async (subDescriptor) => {
            try {
              // subDescriptor.subscriber es la función que ejecuta la lógica
              await subDescriptor.subscriber(message)
            } catch (err) {
              this.logger_.error(
                `Error processing ${routingKey} in RabbitMQ subscriber: ${err}`
              )
            }
          })
        )
      }, { noAck: true })

      this.isReady_ = true
      this.logger_.info("RabbitMQ Event Bus is ready.")
      this.logger_.info(`Conectado a RabbitMQ. Cola: ${this.queueName_}`)
    } catch (err) {
      this.logger_.error(`Failed to connect to RabbitMQ: ${err}`)
    }
  }

  // --- IMPLEMENTACIÓN DE MÉTODOS ABSTRACTOS ---
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
    if (this.isReady_ && this.queueName_ && typeof eventName === 'string') {
      const exchange = this.options_.exchange || "medusa-events"
      this.channel_.bindQueue(this.queueName_, exchange, eventName)
        .catch(err => this.logger_.error(`Error binding queue for ${eventName}: ${err}`))
    }

    return this
  }

  async emit<T>(
    data: EventBusTypes.Message<T> | EventBusTypes.Message<T>[],
    options: Record<string, unknown> = {}
  ): Promise<void> {
    const events = Array.isArray(data) ? data : [data]

    // Si hay un ID de grupo, NO enviamos todavía. Lo guardamos en memoria.
    // Esto es vital para las transacciones de Medusa.
    const groupId = options.eventGroupId as string
    if (groupId) {
      const existing = this.stagedEvents_.get(groupId) || []
      this.stagedEvents_.set(groupId, [...existing, ...events])
      return
    }

    // Si no hay grupo, enviamos inmediatamente
    await this.publishEvents(events)
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
      (e) => !options.eventNames?.includes(e.eventName)
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

    const exchange = this.options_.exchange || "medusa-events"

    // Interceptores (opcional, pero buena práctica llamar a la clase padre)
    // await Promise.all(events.map(e => this.callInterceptors(e)))

    for (const event of events) {
      const buffer = Buffer.from(JSON.stringify(event))
      this.channel_.publish(exchange, event.eventName, buffer)
    }
  }

  // Sobrescribir subscribe para hacer binding en RabbitMQ si es necesario
  // Nota: En arquitecturas topic, a veces es mejor hacer bind de "*" o manejarlo dinámicamente.
  // Por simplicidad, aquí asumimos que escuchas todo o configuras bindings manuales.
}
