import type { IEventBus, MessageHandler } from "./IEventBus"
import type { EventEnvelope } from "../envelope"

/**
 * No-op event bus used when RabbitMQ is not available (tests, local dev without RabbitMQ).
 * All operations are silent no-ops. Events published are dropped; subscriptions are ignored.
 */
export class NoOpEventBus implements IEventBus {
  async publish(_envelope: EventEnvelope): Promise<void> {}
  async publishBatch(_envelopes: EventEnvelope[]): Promise<void> {}
  async publishToExchange(
    _exchange: string,
    _routingKey: string,
    _payload: Record<string, unknown>,
    _options?: { persistent?: boolean; headers?: Record<string, string> }
  ): Promise<void> {}
  async subscribe(_routingKey: string, _handler: MessageHandler): Promise<void> {}
  async unsubscribe(_routingKey: string): Promise<void> {}
  ack(_message: unknown): void {}
  nack(_message: unknown, _requeue?: boolean): void {}
  isReady(): boolean {
    return false
  }
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
}