import { registerOtel } from "@medusajs/medusa"
import {
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base"
import { ExportResultCode } from "@opentelemetry/core"
import { registerInstrumentations } from "@opentelemetry/instrumentation"

// ---------------------------------------------------------------------------
// Protocol selection: http/protobuf (Grafana Cloud default) or http/json
// ---------------------------------------------------------------------------
const OTEL_PROTOCOL = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "http/protobuf"

function isProtobuf(): boolean {
  return OTEL_PROTOCOL === "http/protobuf"
}

// Dynamic imports based on protocol
function createTraceExporter(url: string, headers: Record<string, string>) {
  if (isProtobuf()) {
    const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto")
    return new OTLPTraceExporter({ url, headers })
  }
  const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http")
  return new OTLPTraceExporter({ url, headers })
}

function createMetricExporter(url: string, headers: Record<string, string>) {
  if (isProtobuf()) {
    const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-proto")
    return new OTLPMetricExporter({ url, headers })
  }
  const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http")
  return new OTLPMetricExporter({ url, headers })
}

// ---------------------------------------------------------------------------
// Standard OTel environment variables (Grafana Cloud format)
// ---------------------------------------------------------------------------
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
const serviceName = process.env.OTEL_SERVICE_NAME || "medusa-server"
const serviceVersion =
  process.env.OTEL_SERVICE_VERSION || process.env.npm_package_version || "0.0.1"
const deploymentEnv =
  process.env.OTEL_DEPLOYMENT_ENVIRONMENT ||
  process.env.NODE_ENV ||
  "development"

// ---------------------------------------------------------------------------
// OTEL_RESOURCE_ATTRIBUTES parser
// Format: "key=value,key2=value2"
// Standard OTel env var for resource attributes.
// ---------------------------------------------------------------------------
function parseResourceAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const pair of raw.split(",")) {
    const idx = pair.indexOf("=")
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const value = pair.slice(idx + 1).trim()
    if (key) attrs[key] = value
  }
  return attrs
}

// ---------------------------------------------------------------------------
// OTEL_EXPORTER_OTLP_HEADERS parser
// Format: "Authorization=Basic <base64>,X-Custom=value"
// Handles base64 tokens with = padding correctly.
// ---------------------------------------------------------------------------
function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const entries: string[] = []
  let current = ""
  for (const char of raw) {
    if (char === ",") {
      entries.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  if (current.trim()) entries.push(current.trim())

  for (const entry of entries) {
    const idx = entry.indexOf("=")
    if (idx === -1) continue
    const key = entry.slice(0, idx).trim()
    const value = entry.slice(idx + 1).trim()
    if (key) headers[key] = value
  }
  return headers
}

function buildHeaders(): Record<string, string> {
  const explicit = process.env.OTEL_EXPORTER_OTLP_HEADERS
  if (explicit) {
    return parseHeaders(explicit)
  }
  return {}
}

// ---------------------------------------------------------------------------
// SlowSpanSummaryExporter — logs slow spans to console in addition to OTLP
// ---------------------------------------------------------------------------
const MIN_SPAN_DURATION_MS = 1000

class SlowSpanSummaryExporter implements SpanExporter {
  constructor(private readonly minDurationMs: number) {}

  export(
    spans: ReadableSpan[],
    resultCallback: Parameters<SpanExporter["export"]>[1]
  ): void {
    for (const span of spans) {
      const durationMs = this.toMilliseconds(span.duration)
      if (durationMs <= this.minDurationMs) continue

      const scope = span.instrumentationScope?.name ?? "unknown"
      const statusCode = span.status?.code ?? 0
      console.info(
        `[otel-slow-span] name="${span.name}" scope="${scope}" duration_ms=${durationMs.toFixed(2)} status=${statusCode}`
      )
    }
  }

  shutdown(): Promise<void> { return Promise.resolve() }
  forceFlush(): Promise<void> { return Promise.resolve() }

  private toMilliseconds(duration: ReadableSpan["duration"]): number {
    return duration[0] * 1_000 + duration[1] / 1_000_000
  }
}

// ---------------------------------------------------------------------------
// Exporters
// ---------------------------------------------------------------------------
function buildTraceExporter(): SpanExporter {
  if (!otlpEndpoint) {
    return new SlowSpanSummaryExporter(MIN_SPAN_DURATION_MS)
  }
  const url = `${otlpEndpoint}/v1/traces`
  const headers = buildHeaders()
  return createTraceExporter(url, headers)
}

function buildMetricReader() {
  if (!otlpEndpoint) return undefined
  const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics")
  const url = `${otlpEndpoint}/v1/metrics`
  const headers = buildHeaders()
  const exporter = createMetricExporter(url, headers)
  return new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export function register() {
  const traceExporter = buildTraceExporter()
  const metricReader = buildMetricReader()

  const sdk = registerOtel({
    serviceName,
    exporter: traceExporter,
    ...(metricReader ? { metricReader } : {}),
    instrument: {
      http: true,
      workflows: true,
      query: true,
      db: true,
      cache: true,
    },
  })

  // Redis (ioredis) instrumentation — registerOtel doesn't support `redis: true`.
  // The locking module (@medusajs/locking-redis) and event-bus use ioredis.
  // This creates a span for every Redis command, exported to Grafana via OTLP.
  registerInstrumentations({
    instrumentations: [
      new (require("@opentelemetry/instrumentation-ioredis").IORedisInstrumentation)(),
    ],
  })

  // Apply resource attributes from OTEL_RESOURCE_ATTRIBUTES env var
  // and built-in attributes for Grafana Cloud dashboards
  if (sdk && typeof sdk === "object" && "resource" in sdk) {
    const resource = (sdk as { resource?: { attributes?: Map<string, unknown> } }).resource
    if (resource?.attributes) {
      // Standard attributes
      resource.attributes.set("service.version", serviceVersion)
      resource.attributes.set("deployment.environment", deploymentEnv)

      // OTEL_RESOURCE_ATTRIBUTES (e.g. "service.namespace=commerce")
      const resourceAttrs = process.env.OTEL_RESOURCE_ATTRIBUTES
      if (resourceAttrs) {
        for (const [key, value] of Object.entries(parseResourceAttributes(resourceAttrs))) {
          resource.attributes.set(key, value)
        }
      }
    }
  }

  // Debug: log full config (redact base64 token)
  const headers = buildHeaders()
  const authPreview = headers["Authorization"]
    ? headers["Authorization"].slice(0, 20) + "...(redacted)"
    : "(none)"
  const resourceAttrs = process.env.OTEL_RESOURCE_ATTRIBUTES || "(none)"

  console.info("")
  console.info("═══════════════════════════════════════════════════════════════")
  console.info("  OTLP CONFIGURATION")
  console.info("═══════════════════════════════════════════════════════════════")
  console.info(`  endpoint  : ${otlpEndpoint || "(not set — using console fallback)"}`)
  console.info(`  protocol  : ${OTEL_PROTOCOL}`)
  console.info(`  service   : ${serviceName}`)
  console.info(`  version   : ${serviceVersion}`)
  console.info(`  env       : ${deploymentEnv}`)
  console.info(`  resources : ${resourceAttrs}`)
  console.info(`  auth      : ${authPreview}`)
  console.info(`  traces    : ${otlpEndpoint ? "otlp → " + otlpEndpoint : "console (slow span logger)"}`)
  console.info(`  metrics   : ${metricReader ? "otlp → " + otlpEndpoint : "disabled"}`)
  console.info("═══════════════════════════════════════════════════════════════")
  console.info("")
}
