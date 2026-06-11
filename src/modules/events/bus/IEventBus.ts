import type { EventEnvelope } from "../envelope"

export interface IEventBus {
  publish(envelope: EventEnvelope): Promise<void>
  publishBatch(envelopes: EventEnvelope[]): Promise<void>
  publishToExchange(
    exchange: string,
    routingKey: string,
    payload: Record<string, unknown>,
    options?: { persistent?: boolean; headers?: Record<string, string> }
  ): Promise<void>
  subscribe(routingKey: string, handler: MessageHandler): Promise<void>
  unsubscribe(routingKey: string): Promise<void>
  ack(message: unknown): void
  nack(message: unknown, requeue?: boolean): void
  isReady(): boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
}

export interface MessageHandler {
  (envelope: EventEnvelope, rawMessage: unknown): Promise<void>
}

export interface EventBusOptions {
  url: string
  prefetch?: number
  workerMode?: "server" | "worker" | "shared"
  maxRetries?: number
}
