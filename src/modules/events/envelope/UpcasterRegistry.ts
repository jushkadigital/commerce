import { type EventEnvelope } from "./EventEnvelope"

export interface EventUpcaster<T = unknown> {
  eventType: string
  fromVersion: number
  toVersion: number
  upcast(envelope: EventEnvelope<T>): EventEnvelope<unknown>
}

export class UpcasterRegistry {
  private readonly upcasters: Map<string, EventUpcaster>

  constructor() {
    this.upcasters = new Map()
  }

  register(upcaster: EventUpcaster): void {
    const key = `${upcaster.eventType}:${upcaster.fromVersion}`
    this.upcasters.set(key, upcaster)
  }

  upcast<T>(envelope: EventEnvelope<T>): EventEnvelope<unknown> {
    let current = envelope as EventEnvelope<unknown>
    const eventType = `${current.type}.${current.aggregateType}.${current.action}`

    while (true) {
      const key = `${eventType}:${current.version}`
      const upcaster = this.upcasters.get(key)

      if (!upcaster) {
        break
      }

      current = upcaster.upcast(current)
    }

    return current
  }
}

export const upcasterRegistry = new UpcasterRegistry()
