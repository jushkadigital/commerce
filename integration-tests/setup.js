const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()

// ---------------------------------------------------------------------------
// OpenTelemetry: Initialize SDK so traces/metrics reach the OTel collector
// during integration tests. Mirrors the logic in instrumentation.ts.
// ---------------------------------------------------------------------------
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    const { registerOtel } = require("@medusajs/medusa")
    const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics")

    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    const serviceName = process.env.OTEL_SERVICE_NAME || "medusa-server-test"
    const protocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "http/protobuf"
    const isProto = protocol === "http/protobuf"

    // Parse OTEL_EXPORTER_OTLP_HEADERS (e.g. "Authorization=Basic xxx,Key=val")
    function parseHeaders(raw) {
      const headers = {}
      const entries = []
      let current = ""
      for (const char of raw) {
        if (char === ",") { entries.push(current.trim()); current = "" }
        else { current += char }
      }
      if (current.trim()) entries.push(current.trim())
      for (const entry of entries) {
        const idx = entry.indexOf("=")
        if (idx === -1) continue
        headers[entry.slice(0, idx).trim()] = entry.slice(idx + 1).trim()
      }
      return headers
    }

    const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS
      ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
      : {}

    const TraceExporter = isProto
      ? require("@opentelemetry/exporter-trace-otlp-proto").OTLPTraceExporter
      : require("@opentelemetry/exporter-trace-otlp-http").OTLPTraceExporter

    const MetricExporter = isProto
      ? require("@opentelemetry/exporter-metrics-otlp-proto").OTLPMetricExporter
      : require("@opentelemetry/exporter-metrics-otlp-http").OTLPMetricExporter

    const exporter = new TraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      ...(Object.keys(headers).length ? { headers } : {}),
    })

    const metricReader = new PeriodicExportingMetricReader({
      exporter: new MetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
      exportIntervalMillis: 30_000,
    })

    registerOtel({
      serviceName,
      exporter,
      metricReader,
      instrument: {
        http: true,
        workflows: true,
        query: true,
        db: true,
        cache: true,
      },
    })
  } catch (err) {
    // Non-fatal: tests still run without observability
    console.warn(
      `[otel-setup] Failed to initialize OTel SDK for tests: ${err.message}`
    )
  }
}
