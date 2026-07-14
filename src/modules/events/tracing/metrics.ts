import type { Counter, Histogram, Meter } from "@opentelemetry/api"
import * as api from "@opentelemetry/api"

// ─── Tourism Events Meter ────────────────────────────────────────────────────
const EVENTS_METER_NAME = "tourism-events"

function getEventsMeter(): Meter {
  return api.metrics.getMeter(EVENTS_METER_NAME)
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

function getEventInstruments() {
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

  const meter = getEventsMeter()

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
  const instruments = getEventInstruments()
  instruments.eventsPublished.add(1, attrs)
  instruments.publishDuration.record(durationMs, attrs)
}

export function recordConsume(eventType: string, durationMs: number): void {
  const attrs = parseEventAttributes(eventType)
  const instruments = getEventInstruments()
  instruments.eventsConsumed.add(1, attrs)
  instruments.processDuration.record(durationMs, attrs)
}

export function recordFailure(eventType: string): void {
  const attrs = parseEventAttributes(eventType)
  getEventInstruments().eventsFailed.add(1, attrs)
}

export function recordRetry(eventType: string): void {
  const attrs = parseEventAttributes(eventType)
  getEventInstruments().eventsRetried.add(1, attrs)
}

export function recordDeadLetter(eventType: string): void {
  const attrs = parseEventAttributes(eventType)
  getEventInstruments().eventsDeadLettered.add(1, attrs)
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
  const meter = getEventsMeter()
  const instruments = getEventInstruments()
  return {
    meter,
    ...instruments,
  }
}

// ─── HTTP Metrics Meter ──────────────────────────────────────────────────────
const HTTP_METER_NAME = "medusa-http"

let httpRequestDuration: Histogram | null = null
let httpRequestTotal: Counter | null = null
let httpResponseSize: Histogram | null = null

function getHttpInstruments() {
  if (httpRequestDuration) {
    return { httpRequestDuration, httpRequestTotal: httpRequestTotal!, httpResponseSize: httpResponseSize! }
  }

  const meter = api.metrics.getMeter(HTTP_METER_NAME)

  httpRequestDuration = meter.createHistogram("http.request.duration", {
    description: "HTTP request latency in milliseconds",
    unit: "ms",
  })
  httpRequestTotal = meter.createCounter("http.request.total", {
    description: "Total HTTP requests by method, status, and route",
  })
  httpResponseSize = meter.createHistogram("http.response.body.size", {
    description: "HTTP response body size in bytes",
    unit: "bytes",
  })

  return { httpRequestDuration, httpRequestTotal: httpRequestTotal!, httpResponseSize: httpResponseSize! }
}

export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number,
  responseSize?: number
): void {
  const attrs = { method, route, status_code: String(statusCode) }
  const instruments = getHttpInstruments()
  instruments.httpRequestDuration.record(durationMs, attrs)
  instruments.httpRequestTotal.add(1, attrs)
  if (responseSize !== undefined) {
    instruments.httpResponseSize.record(responseSize, attrs)
  }
}

// ─── Workflow Metrics Meter ──────────────────────────────────────────────────
const WORKFLOW_METER_NAME = "medusa-workflow"

let workflowDuration: Histogram | null = null
let workflowTotal: Counter | null = null
let workflowFailed: Counter | null = null

function getWorkflowInstruments() {
  if (workflowDuration) {
    return { workflowDuration, workflowTotal: workflowTotal!, workflowFailed: workflowFailed! }
  }

  const meter = api.metrics.getMeter(WORKFLOW_METER_NAME)

  workflowDuration = meter.createHistogram("workflow.execution.duration", {
    description: "Workflow execution duration in milliseconds",
    unit: "ms",
  })
  workflowTotal = meter.createCounter("workflow.execution.total", {
    description: "Total workflow executions",
  })
  workflowFailed = meter.createCounter("workflow.execution.failed", {
    description: "Total failed workflow executions",
  })

  return { workflowDuration, workflowTotal: workflowTotal!, workflowFailed: workflowFailed! }
}

export function recordWorkflowExecution(
  workflowId: string,
  durationMs: number,
  success: boolean
): void {
  const attrs = { workflow_id: workflowId }
  const instruments = getWorkflowInstruments()
  instruments.workflowDuration.record(durationMs, attrs)
  instruments.workflowTotal.add(1, attrs)
  if (!success) {
    instruments.workflowFailed.add(1, attrs)
  }
}

// ─── Cache Metrics Meter ─────────────────────────────────────────────────────
const CACHE_METER_NAME = "medusa-cache"

let cacheOperationTotal: Counter | null = null
let cacheOperationDuration: Histogram | null = null

function getCacheInstruments() {
  if (cacheOperationTotal) {
    return { cacheOperationTotal, cacheOperationDuration: cacheOperationDuration! }
  }

  const meter = api.metrics.getMeter(CACHE_METER_NAME)

  cacheOperationTotal = meter.createCounter("cache.operation.total", {
    description: "Total cache operations by type and result",
  })
  cacheOperationDuration = meter.createHistogram("cache.operation.duration", {
    description: "Cache operation latency in milliseconds",
    unit: "ms",
  })

  return { cacheOperationTotal, cacheOperationDuration: cacheOperationDuration! }
}

export function recordCacheOperation(
  operation: string,
  hit: boolean,
  durationMs: number
): void {
  const attrs = { operation, hit: String(hit) }
  const instruments = getCacheInstruments()
  instruments.cacheOperationTotal.add(1, attrs)
  instruments.cacheOperationDuration.record(durationMs, attrs)
}

// ─── Business Metrics Meter ──────────────────────────────────────────────────
const BUSINESS_METER_NAME = "medusa-business"

let ordersCreated: Counter | null = null
let bookingsConfirmed: Counter | null = null
let paymentsProcessed: Counter | null = null
let orderRevenue: Histogram | null = null

function getBusinessInstruments() {
  if (ordersCreated) {
    return { ordersCreated, bookingsConfirmed: bookingsConfirmed!, paymentsProcessed: paymentsProcessed!, orderRevenue: orderRevenue! }
  }

  const meter = api.metrics.getMeter(BUSINESS_METER_NAME)

  ordersCreated = meter.createCounter("business.orders.created", {
    description: "Total orders created",
  })
  bookingsConfirmed = meter.createCounter("business.bookings.confirmed", {
    description: "Total bookings confirmed",
  })
  paymentsProcessed = meter.createCounter("business.payments.processed", {
    description: "Total payments processed",
  })
  orderRevenue = meter.createHistogram("business.orders.revenue", {
    description: "Order revenue amount",
    unit: "USD",
  })

  return { ordersCreated, bookingsConfirmed: bookingsConfirmed!, paymentsProcessed: paymentsProcessed!, orderRevenue: orderRevenue! }
}

export function recordOrderCreated(tourType?: string): void {
  const attrs = tourType ? { tour_type: tourType } : {}
  getBusinessInstruments().ordersCreated.add(1, attrs)
}

export function recordBookingConfirmed(bookingType: string): void {
  getBusinessInstruments().bookingsConfirmed.add(1, { booking_type: bookingType })
}

export function recordPaymentProcessed(paymentProvider: string, amount?: number): void {
  const attrs = { provider: paymentProvider }
  const instruments = getBusinessInstruments()
  instruments.paymentsProcessed.add(1, attrs)
  if (amount !== undefined) {
    instruments.orderRevenue.record(amount, attrs)
  }
}
