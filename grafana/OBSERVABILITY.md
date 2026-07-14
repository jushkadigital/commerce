# Observabilidad — Grafana Cloud

## Variables de Entorno (formato Grafana Cloud)

```bash
OTEL_SERVICE_NAME="medusa-server"
OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-sa-east-1.grafana.net/otlp"
OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64(instanceId:apiKey)>"
OTEL_TRACES_EXPORTER="otlp"
OTEL_NODE_RESOURCE_DETECTORS="env,host,os"
```

Fuente: https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/

## Setup

1. Ir a **Grafana Cloud → My Cloud → Stack → Connections → OpenTelemetry**
2. Copiar **Instance ID** y generar **API Key** (roles: Metrics Writer + Traces Writer)
3. Copiar la **OTLP Endpoint URL**
4. Generar el header:
   ```bash
   echo -n "INSTANCE_ID:API_KEY" | base64
   ```
5. Copiar `.env.grafana-cloud` a `.env.prod` y reemplazar valores
6. Rebuild y deploy

## Instrumentación

| Capa | Qué cubre | Fuente |
|---|---|---|
| `http` | Requests HTTP (method, route, status, latency) | Medusa OTel SDK |
| `workflows` | Ejecución de workflows (pasos, duración) | Medusa OTel SDK |
| `query` | Remote Query / graph queries | Medusa OTel SDK |
| `db` | PostgreSQL queries (automática) | PgInstrumentation |
| `cache` | Operaciones cache (hit/miss, latency) | Medusa OTel SDK |
| `events.*` | Event bus RabbitMQ (custom) | tourism-events meter |
| `http.request.*` | HTTP metrics custom | medusa-http meter |
| `workflow.*` | Workflow metrics custom | medusa-workflow meter |
| `cache.operation.*` | Cache metrics custom | medusa-cache meter |
| `business.*` | Órdenes, bookings, revenue | medusa-business meter |

## Dashboards

Importar `grafana/dashboards/medusa-overview.json` en Grafana Cloud:
- **HTTP RED**: request rate, latencia P50/P95/P99, error rate
- **Event Bus**: published/consumed/failed/DLQ, processing duration
- **Workflows**: ejecuciones, duración P95, fallos
- **Business**: órdenes, bookings, revenue

## Alertas

Importar `grafana/provisioning/alerting/medusa-alerts.yml`:

| Alerta | Condición | Severidad |
|---|---|---|
| High Error Rate | > 5% HTTP errors / 5 min | critical |
| High Latency | P95 > 2s / 5 min | warning |
| DLQ Growth | > 10 dead-lettered / 10 min | warning |
| Low Cache Hit | < 80% hit ratio / 10 min | info |
| Workflow Failures | > 10% failed / 5 min | critical |

## Modo Development

Sin `OTEL_EXPORTER_OTLP_ENDPOINT`, el SDK usa `SlowSpanSummaryExporter` que loggea spans > 1s a stdout. Las métricas no se exportan.
