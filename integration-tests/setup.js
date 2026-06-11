const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()

// ---------------------------------------------------------------------------
// OpenTelemetry: Initialize SDK so traces/metrics reach the OTel collector
// during integration tests. Mirrors the logic in instrumentation.ts.
// ---------------------------------------------------------------------------
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    const { registerOtel } = require("@medusajs/medusa")
    const {
      OTLPTraceExporter,
    } = require("@opentelemetry/exporter-trace-otlp-http")

    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    const serviceName = process.env.OTEL_SERVICE_NAME || "medusa-server-test"

    const exporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    })

    registerOtel({
      serviceName,
      exporter,
      instrument: {
        http: true,
        workflows: true,
        query: true,
        db: true,
      },
    })
  } catch (err) {
    // Non-fatal: tests still run without observability
    console.warn(
      `[otel-setup] Failed to initialize OTel SDK for tests: ${err.message}`
    )
  }
}