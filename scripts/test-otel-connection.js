/**
 * Diagnostic script — run this on the VPS to verify OTLP → Grafana Cloud connectivity.
 *
 * Usage:
 *   node scripts/test-otel-connection.js
 *
 * Or inside Docker:
 *   docker exec medusa-app-server node scripts/test-otel-connection.js
 */

// ── 1. Load env vars the same way Medusa does ──────────────────────────────
const path = require("path")
const fs = require("fs")

const envDir = process.cwd()
const NODE_ENV = process.env.NODE_ENV || "production"
const envSpecificFile = path.join(envDir, `.env.${NODE_ENV}`)
const envBaseFile = path.join(envDir, ".env")

try { require("dotenv").config({ path: envSpecificFile, override: true }) } catch {}
try { require("dotenv").config({ path: envBaseFile, override: false }) } catch {}

// ── 2. Print loaded OTel env vars (redacted) ───────────────────────────────
console.log("═══════════════════════════════════════════════════════════════")
console.log("  OTLP DIAGNOSTIC —", new Date().toISOString())
console.log("═══════════════════════════════════════════════════════════════\n")

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
const protocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "http/protobuf"
const headersRaw = process.env.OTEL_EXPORTER_OTLP_HEADERS
const serviceName = process.env.OTEL_SERVICE_NAME || "medusa-server"

console.log("OTEL_EXPORTER_OTLP_ENDPOINT :", endpoint || "(NOT SET)")
console.log("OTEL_EXPORTER_OTLP_PROTOCOL :", protocol)
console.log("OTEL_SERVICE_NAME           :", serviceName)
console.log("OTEL_TRACES_EXPORTER        :", process.env.OTEL_TRACES_EXPORTER || "(NOT SET)")
console.log("OTEL_EXPORTER_OTLP_HEADERS  :", headersRaw ? "(set — length=" + headersRaw.length + ")" : "(NOT SET)")
console.log("")

// ── 3. Parse headers ───────────────────────────────────────────────────────
function parseHeaders(raw) {
  const headers = {}
  if (!raw) return headers
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

const headers = parseHeaders(headersRaw)
const authHeader = headers["Authorization"] || headers["authorization"] || null

console.log("Parsed headers:")
for (const [k, v] of Object.entries(headers)) {
  if (k.toLowerCase() === "authorization") {
    const redacted = v.length > 20 ? v.slice(0, 15) + "..." + v.slice(-5) : v
    console.log(`  ${k}: ${redacted} (length=${v.length})`)
  } else {
    console.log(`  ${k}: ${v}`)
  }
}
console.log("")

// ── 4. Validate endpoint URL ───────────────────────────────────────────────
if (!endpoint) {
  console.error("✗ OTEL_EXPORTER_OTLP_ENDPOINT is not set!")
  console.error("  Add it to .env or .env.production")
  process.exit(1)
}

let url
try {
  url = new URL(endpoint)
  console.log("Endpoint URL parsed OK:")
  console.log(`  Protocol: ${url.protocol}`)
  console.log(`  Host:     ${url.host}`)
  console.log(`  Path:     ${url.pathname}`)
} catch (e) {
  console.error("✗ Invalid OTEL_EXPORTER_OTLP_ENDPOINT URL:", e.message)
  process.exit(1)
}

if (!authHeader) {
  console.error("✗ No Authorization header found in OTEL_EXPORTER_OTLP_HEADERS!")
  console.error("  Expected format: OTEL_EXPORTER_OTLP_HEADERS=\"Authorization=Basic <base64>\"")
  console.error("")
  console.error("  Generate with:  echo -n 'INSTANCE_ID:API_KEY' | base64")
  process.exit(1)
}

console.log("")

// ── 5. Test HTTP connectivity ──────────────────────────────────────────────
const https = require("https")
const http = require("http")

const tracesUrl = `${endpoint}/v1/traces`
console.log("Testing connectivity to:", tracesUrl)

const testPayload = Buffer.from(
  JSON.stringify({
    resourceSpans: [{
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: serviceName + "-test" } },
        ],
      },
      scopeSpans: [{
        scope: { name: "test" },
        spans: [{
          traceId: "00000000000000000000000000000001",
          spanId: "0000000000000001",
          name: "test-span-manual",
          kind: 1,
          startTimeUnixNano: String(BigInt(Date.now()) * 1000000n),
          endTimeUnixNano: String(BigInt(Date.now()) * 1000000n + 100000000n),
          status: { code: 1 },
        }],
      }],
    }],
  })
)

const protoHeaders = {
  "Content-Type": "application/x-protobuf",
  ...headers,
}
const jsonHeaders = {
  "Content-Type": "application/json",
  ...headers,
}

// Try with the configured protocol first, then fallback
const protocolsToTry = protocol === "http/protobuf"
  ? [
      { name: "protobuf", headers: protoHeaders, payload: testPayload },
      { name: "json", headers: jsonHeaders, payload: Buffer.from(JSON.stringify({
        resourceSpans: [{
          resource: { attributes: [{ key: "service.name", value: { stringValue: serviceName + "-test" } }] },
          scopeSpans: [{ scope: { name: "test" }, spans: [{
            traceId: "00000000000000000000000000000001",
            spanId: "0000000000000001",
            name: "test-span-manual",
            kind: 1,
            startTimeUnixNano: String(BigInt(Date.now()) * 1000000n),
            endTimeUnixNano: String(BigInt(Date.now()) * 1000000n + 100000000n),
            status: { code: 1 },
          }],
          }],
        }],
      })) },
    ]
  : [
      { name: "json", headers: jsonHeaders, payload: Buffer.from(JSON.stringify({
        resourceSpans: [{
          resource: { attributes: [{ key: "service.name", value: { stringValue: serviceName + "-test" } }] },
          scopeSpans: [{ scope: { name: "test" }, spans: [{
            traceId: "00000000000000000000000000000001",
            spanId: "0000000000000001",
            name: "test-span-manual",
            kind: 1,
            startTimeUnixNano: String(BigInt(Date.now()) * 1000000n),
            endTimeUnixNano: String(BigInt(Date.now()) * 1000000n + 100000000n),
            status: { code: 1 },
          }],
          }],
        }],
      })) },
    ]

async function tryProtocol(protocolAttempt) {
  return new Promise((resolve) => {
    const mod = url.protocol === "https:" ? https : http
    const req = mod.request(tracesUrl, {
      method: "POST",
      headers: protocolAttempt.headers,
      timeout: 15000,
    }, (res) => {
      let body = ""
      res.on("data", (chunk) => { body += chunk })
      res.on("end", () => {
        resolve({ status: res.statusCode, body, protocol: protocolAttempt.name })
      })
    })
    req.on("error", (e) => {
      resolve({ status: 0, body: e.message, protocol: protocolAttempt.name })
    })
    req.on("timeout", () => {
      req.destroy()
      resolve({ status: 0, body: "TIMEOUT (15s)", protocol: protocolAttempt.name })
    })
    req.write(protocolAttempt.payload)
    req.end()
  })
}

async function main() {
  for (const attempt of protocolsToTry) {
    console.log(`Trying ${attempt.name}...`)
    const result = await tryProtocol(attempt)

    if (result.status >= 200 && result.status < 300) {
      console.log(`✓ SUCCESS — HTTP ${result.status} (protocol: ${result.protocol})`)
      if (result.body) console.log(`  Response: ${result.body.slice(0, 200)}`)
      console.log("")
      console.log("═══════════════════════════════════════════════════════════════")
      console.log("  VERDICT: Grafana Cloud OTLP endpoint is reachable!")
      console.log("  Check Grafana → Explore → Tempo for the test span")
      console.log("  (search for service=" + serviceName + "-test, span=test-span-manual)")
      console.log("═══════════════════════════════════════════════════════════════")
      return
    }

    console.log(`✗ FAIL — HTTP ${result.status}: ${result.body.slice(0, 200)}`)
    console.log("")
  }

  console.log("═══════════════════════════════════════════════════════════════")
  console.log("  VERDICT: Could not reach Grafana Cloud OTLP endpoint.")
  console.log("")
  console.log("  Common causes:")
  console.log("  1. Invalid API key → regenerate in Grafana Cloud → API Keys")
  console.log("  2. Wrong instance ID → check in Connections → OpenTelemetry")
  console.log("  3. Wrong zone in URL → check OTLP endpoint URL")
  console.log("  4. Firewall blocking outbound HTTPS to otlp-gateway-*.grafana.net")
  console.log("  5. Base64 token missing padding → echo -n 'id:key' | base64")
  console.log("═══════════════════════════════════════════════════════════════")
}

main().catch(console.error)
