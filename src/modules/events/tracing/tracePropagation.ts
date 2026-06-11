import type { Context, Span, SpanContext, Tracer } from "@opentelemetry/api"
import * as api from "@opentelemetry/api"
import { type EventEnvelope, buildRoutingKey } from "../envelope"

export function injectTraceContextIntoEnvelope(
  envelope: EventEnvelope
): EventEnvelope {
  const activeSpan = api.trace.getSpan(api.context.active())

  if (!activeSpan) {
    return envelope
  }

  const spanContext = activeSpan.spanContext()
  const traceFlagsHex = spanContext.traceFlags
    .toString(16)
    .padStart(2, "0")
  const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${traceFlagsHex}`

  const traceContext: Record<string, string> = {
    traceparent,
  }

  if (spanContext.traceState) {
    const traceStateStr = spanContext.traceState.serialize()
    if (traceStateStr) {
      traceContext.tracestate = traceStateStr
    }
  }

  return {
    ...envelope,
    metadata: {
      ...envelope.metadata,
      traceContext: {
        ...(envelope.metadata.traceContext || {}),
        ...traceContext,
      },
    },
  }
}

export function extractTraceContextFromEnvelope(
  envelope: EventEnvelope
): Context {
  const traceContext = envelope.metadata?.traceContext

  if (!traceContext) {
    return api.context.active()
  }

  const traceparent = traceContext.traceparent
  if (!traceparent) {
    return api.context.active()
  }

  const parts = traceparent.split("-")
  if (parts.length !== 4) {
    return api.context.active()
  }

  const [, traceId, spanId, traceFlagsHex] = parts

  if (
    !/^[0-9a-f]{32}$/i.test(traceId) ||
    !/^[0-9a-f]{16}$/i.test(spanId) ||
    !/^[0-9a-f]{2}$/i.test(traceFlagsHex)
  ) {
    return api.context.active()
  }

  const traceFlags = parseInt(traceFlagsHex, 16)

  const spanContext: SpanContext = {
    traceId: traceId.toLowerCase(),
    spanId: spanId.toLowerCase(),
    traceFlags,
    isRemote: true,
  }

  if (traceContext.tracestate) {
    try {
      const traceState = api.createTraceState(traceContext.tracestate)
      ;(
        spanContext as SpanContext & { traceState?: typeof traceState }
      ).traceState = traceState
    } catch {
      // ignore invalid tracestate
    }
  }

  const span = api.trace.wrapSpanContext(spanContext)
  return api.trace.setSpan(api.context.active(), span)
}

export function startEventSpan(
  name: string,
  envelope: EventEnvelope
): Span {
  const tracer: Tracer = api.trace.getTracer("tourism-events")
  const parentContext = extractTraceContextFromEnvelope(envelope)

  const exchange = `${envelope.type}.${envelope.aggregateType}`
  const routingKey = buildRoutingKey(
    envelope.type,
    envelope.aggregateType,
    envelope.action,
    envelope.version
  )

  return tracer.startSpan(
    name,
    {
      attributes: {
        "messaging.system": "rabbitmq",
        "messaging.destination.name": exchange,
        "messaging.rabbitmq.routing_key": routingKey,
        "messaging.message.id": envelope.id,
        "messaging.message.correlation_id": envelope.metadata.correlationId,
      },
    },
    parentContext
  )
}
