import type { ZodSchema, ZodError } from "zod"
import type { EventCategory } from "../envelope"

export interface EventDescriptor {
  eventType: string
  category: EventCategory
  aggregateType: string
  action: string
  version: number
  exchange: string
  routingKey: string
  schema?: ZodSchema
  description: string
  producer: string
}

export interface ValidationResult {
  success: boolean
  errors?: ZodError
}

export class EventRegistry {
  private events: Map<string, EventDescriptor> = new Map()

  register(descriptor: EventDescriptor): void {
    if (this.events.has(descriptor.eventType)) {
      throw new Error(`Event type "${descriptor.eventType}" is already registered`)
    }
    this.events.set(descriptor.eventType, descriptor)
  }

  get(eventType: string): EventDescriptor | undefined {
    return this.events.get(eventType)
  }

  getAll(): EventDescriptor[] {
    return Array.from(this.events.values())
  }

  getByAggregate(aggregateType: string): EventDescriptor[] {
    return this.getAll().filter(
      (descriptor) => descriptor.aggregateType === aggregateType
    )
  }

  getByCategory(category: EventCategory): EventDescriptor[] {
    return this.getAll().filter(
      (descriptor) => descriptor.category === category
    )
  }

  validate(eventType: string, payload: unknown): ValidationResult {
    const descriptor = this.get(eventType)
    if (!descriptor) {
      return { success: false }
    }

    if (!descriptor.schema) {
      return { success: true }
    }

    const result = descriptor.schema.safeParse(payload)
    if (result.success) {
      return { success: true }
    }

    return { success: false, errors: result.error }
  }
}

export const eventRegistry = new EventRegistry()
