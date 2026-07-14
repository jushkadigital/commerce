import type { Logger } from "@medusajs/types"
import amqp, { type Channel, type ChannelModel, type ConfirmChannel } from "amqplib"

export class RabbitMQConnection {
  private connection: ChannelModel | null = null
  private channel: ConfirmChannel | null = null
  private isReady = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectPromise: Promise<void> | null = null

  constructor(
    private readonly url: string,
    private readonly logger: Logger,
    private readonly reconnectDelayMs = 5000
  ) {}

  getChannel(): ConfirmChannel | null {
    return this.channel
  }

  getConnection(): ChannelModel | null {
    return this.connection
  }

  getReady(): boolean {
    return this.isReady
  }

  async connect(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = null
    })

    return this.connectPromise
  }

  private async doConnect(): Promise<void> {
    if (this.isReady) {
      return
    }

    try {
      this.connection = await amqp.connect(this.url)
      this.channel = await this.connection.createConfirmChannel()

      this.isReady = true
      this.bindLifecycle()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.resetRuntimeState()
      this.scheduleReconnect()
      throw error
    }
  }

  private bindLifecycle(): void {
    if (!this.connection || !this.channel) {
      return
    }

    this.connection.on("error", (err) => {
      this.resetRuntimeState()
      this.scheduleReconnect()
    })

    this.connection.on("close", () => {
      this.resetRuntimeState()
      this.scheduleReconnect()
    })

    this.channel.on("error", (err) => {
      this.channel = null
    })

    this.channel.on("close", () => {
      if (!this.isReady) {
        return
      }

      this.resetRuntimeState()
      this.scheduleReconnect()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, this.reconnectDelayMs)
  }

  async safeCloseChannel(): Promise<void> {
    if (!this.channel) {
      return
    }

    const ch = this.channel
    this.channel = null

    try {
      await ch.close()
    } catch {
      // intentionally ignored
    }
  }

  async safeCloseConnection(): Promise<void> {
    if (!this.connection) {
      return
    }

    const conn = this.connection
    this.connection = null

    try {
      await conn.close()
    } catch {
      // intentionally ignored
    }
  }

  resetRuntimeState(): void {
    this.isReady = false
    void this.safeCloseChannel()
    void this.safeCloseConnection()
    this.connection = null
    this.channel = null
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.isReady = false
    await this.safeCloseChannel()
    await this.safeCloseConnection()
    this.connection = null
    this.channel = null
  }
}
