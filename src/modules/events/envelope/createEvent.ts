import {
  type EventEnvelope,
  type EventCategory,
  type RoutingKey,
  buildRoutingKey,
  EVENTS_MODULE_SOURCE,
} from "./EventEnvelope"
import { randomUUID } from "crypto"

export interface CreateEventInput<T> {
  type: EventCategory
  aggregateType: string
  action: string
  version: number
  payload: T
  correlationId?: string
  causationId?: string
  traceContext?: Record<string, string>
  source?: string
}

export function createEvent<T>(input: CreateEventInput<T>): EventEnvelope<T> {
  const id = randomUUID()
  const timestamp = new Date().toISOString()
  const correlationId = input.correlationId ?? id
  const causationId = input.causationId ?? id
  const source = input.source ?? EVENTS_MODULE_SOURCE

  const routingKey: RoutingKey = buildRoutingKey(
    input.type,
    input.aggregateType,
    input.action,
    input.version
  )

  const envelope: EventEnvelope<T> = {
    spec: "tourism-events/v1",
    id,
    type: input.type,
    aggregateType: input.aggregateType,
    action: input.action,
    version: input.version,
    timestamp,
    source,
    metadata: {
      correlationId,
      causationId,
      traceContext: input.traceContext,
    },
    payload: input.payload,
  }

  return Object.assign(envelope, { routingKey })
}
