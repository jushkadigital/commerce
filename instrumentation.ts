import { registerOtel } from "@medusajs/medusa"
import {
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base"
import { ExportResultCode } from "@opentelemetry/core"

const MIN_SPAN_DURATION_MS = 1000

class SlowSpanSummaryExporter implements SpanExporter {
  constructor(private readonly minDurationMs: number) {}

  export(
    spans: ReadableSpan[],
    resultCallback: Parameters<SpanExporter["export"]>[1]
  ): void {
    for (const span of spans) {
      const durationMs = this.toMilliseconds(span.duration)

      if (durationMs <= this.minDurationMs) {
        continue
      }

      const scope = span.instrumentationScope?.name ?? "unknown"
      const statusCode = span.status?.code ?? 0

      console.info(
        `[otel-slow-span] name="${span.name}" scope="${scope}" duration_ms=${durationMs.toFixed(
          2
        )} status=${statusCode}`
      )
    }

    resultCallback({ code: ExportResultCode.SUCCESS })
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  private toMilliseconds(duration: ReadableSpan["duration"]): number {
    return duration[0] * 1000 + duration[1] / 1_000_000
  }
}

export function register() {
  registerOtel({
    serviceName: "medusa-server",
    exporter: new SlowSpanSummaryExporter(MIN_SPAN_DURATION_MS),
    instrument: {
      http: true,
      workflows: true,
      query: true,
      db: true,
    },
  })
}
