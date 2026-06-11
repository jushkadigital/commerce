import type { Counter, Histogram, Meter } from "@opentelemetry/api"
import * as api from "@opentelemetry/api"

const METER_NAME = "tourism-events"

function getMeter(): Meter {
  return api.metrics.getMeter(METER_NAME)
}

function parseEventAttributes(eventType: string): Record<string, string> {
  const parts = eventType.split(".")
  return {
    event_type: eventType,
    aggregate_type: parts[1] || "unknown",
    category: parts[0] || "unknown",
  }
}

let eventsPublished: Counter | null = null
let eventsConsumed: Counter | null = null
let eventsFailed: Counter | null = null
let eventsRetried: Counter | null = null
let eventsDeadLettered: Counter | null = null
let publishDuration: Histogram | null = null
let processDuration: Histogram | null = null

function getInstruments() {
  if (eventsPublished) {
    return {
      eventsPublished,
      eventsConsumed: eventsConsumed!,
      eventsFailed: eventsFailed!,
      eventsRetried: eventsRetried!,
      eventsDeadLettered: eventsDeadLettered!,
      publishDuration: publishDuration!,
      processDuration: processDuration!,
    }
  }

  const meter = getMeter()

  eventsPublished = meter.createCounter("events.published", {
    description: "Total events published",
  })
  eventsConsumed = meter.createCounter("events.consumed", {
    description: "Total events consumed",
  })
  eventsFailed = meter.createCounter("events.failed", {
    description: "Total events that failed processing",
  })
  eventsRetried = meter.createCounter("events.retried", {
    description: "Total retry attempts",
  })
  eventsDeadLettered = meter.createCounter("events.dead_lettered", {
    description: "Total events sent to DLQ",
  })
  publishDuration = meter.createHistogram("events.publish.duration", {
    description: "Time to publish, in ms",
    unit: "ms",
  })
  processDuration = meter.createHistogram("events.process.duration", {
    description: "Time to process consumed event, in ms",
    unit: "ms",
  })

  return {
    eventsPublished,
    eventsConsumed: eventsConsumed!,
    eventsFailed: eventsFailed!,
    eventsRetried: eventsRetried!,
    eventsDeadLettered: eventsDeadLettered!,
    publishDuration: publishDuration!,
    processDuration: processDuration!,
  }
}

export function recordPublish(eventType: string, durationMs: number): void {
  const attrs = parseEventAttributes(eventType)
  const instruments = getInstruments()
  instruments.eventsPublished.add(1, attrs)
  instruments.publishDuration.record(durationMs, attrs)
}

export function recordConsume(eventType: string, durationMs: number): void {
  const attrs = parseEventAttributes(eventType)
  const instruments = getInstruments()
  instruments.eventsConsumed.add(1, attrs)
  instruments.processDuration.record(durationMs, attrs)
}

export function recordFailure(eventType: string): void {
  const attrs = parseEventAttributes(eventType)
  getInstruments().eventsFailed.add(1, attrs)
}

export function recordRetry(eventType: string): void {
  const attrs = parseEventAttributes(eventType)
  getInstruments().eventsRetried.add(1, attrs)
}

export function recordDeadLetter(eventType: string): void {
  const attrs = parseEventAttributes(eventType)
  getInstruments().eventsDeadLettered.add(1, attrs)
}

export interface EventMetrics {
  meter: Meter
  eventsPublished: Counter
  eventsConsumed: Counter
  eventsFailed: Counter
  eventsRetried: Counter
  eventsDeadLettered: Counter
  publishDuration: Histogram
  processDuration: Histogram
}

export function getEventMetrics(): EventMetrics {
  const meter = getMeter()
  const instruments = getInstruments()
  return {
    meter,
    ...instruments,
  }
}
