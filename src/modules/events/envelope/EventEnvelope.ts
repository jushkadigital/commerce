export type EventCategory = "integration" | "notification" | "inbound" | "identity"

export interface EventEnvelope<T = unknown> {
  spec: "tourism-events/v1"
  id: string
  type: EventCategory
  aggregateType: string
  action: string
  version: number
  timestamp: string
  source: string
  metadata: {
    correlationId: string
    causationId: string
    traceContext?: Record<string, string>
  }
  payload: T
}

export type RoutingKey = `${EventCategory}.${string}.${string}.v${number}`

export const EVENTS_MODULE_SOURCE = "medusa-backend"

export function buildRoutingKey(
  type: EventCategory,
  aggregateType: string,
  action: string,
  version: number
): RoutingKey {
  return `${type}.${aggregateType}.${action}.v${version}`
}
