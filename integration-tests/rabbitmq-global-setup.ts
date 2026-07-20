import { RabbitMQContainer } from "@testcontainers/rabbitmq"
import fs from "fs"
import path from "path"

const URL_FILE = "/tmp/rabbitmq-test-url.txt"
const CONTAINER_ID_FILE = "/tmp/rabbitmq-container-id.txt"
const ENV_FILE = path.join(process.cwd(), ".env.test")
const ENV_BACKUP_FILE = "/tmp/.env.test.backup"

// Inject RABBITMQ_URL into .env.test (the file medusa-config.ts loads when NODE_ENV=test).
// Saves a backup first so the teardown can restore the original content.
function injectRabbitUrl(url: string): void {
  // If a previous run crashed and left a backup, restore it first so we start clean
  if (fs.existsSync(ENV_BACKUP_FILE)) {
    const backup = fs.readFileSync(ENV_BACKUP_FILE, "utf-8")
    if (backup === "__NO_FILE__") {
      try { fs.unlinkSync(ENV_FILE) } catch { /* ignore */ }
    } else {
      fs.writeFileSync(ENV_FILE, backup)
    }
    fs.unlinkSync(ENV_BACKUP_FILE)
  }

  // Create a fresh backup of the original .env.test
  if (fs.existsSync(ENV_FILE)) {
    fs.copyFileSync(ENV_FILE, ENV_BACKUP_FILE)
  } else {
    fs.writeFileSync(ENV_BACKUP_FILE, "__NO_FILE__")
  }

  // Remove RABBITMQ_URL and all Redis-related lines so the app boots without Redis
  // (DISABLE_REDIS is false when TEST_RABBITMQ=true, so the app would try to connect
  // to Redis — removing the URLs makes the config fall back to in-memory/undefined).
  const STRIP_PREFIXES = [
    "RABBITMQ_URL=",
    "REDIS_URL=",
    "CACHE_REDIS_URL=",
    "EVENTS_REDIS_URL=",
    "WE_REDIS_URL=",
    "LOCKING_REDIS_URL=",
  ]

  let content = ""
  if (fs.existsSync(ENV_FILE)) {
    content = fs.readFileSync(ENV_FILE, "utf-8")
      .split("\n")
      .filter((line) => !STRIP_PREFIXES.some((p) => line.startsWith(p)))
      .join("\n")
    if (!content.endsWith("\n")) content += "\n"
  }
  content += `RABBITMQ_URL=${url}\n`
  fs.writeFileSync(ENV_FILE, content)
}

export default async function (): Promise<void> {
  // Allow running the RabbitMQ tests against an externally-provided broker instead of a
  // testcontainer (e.g. for local debugging). Set RABBITMQ_TEST_REUSE_URL=1 and
  // RABBITMQ_URL=<amqp url>; the URL is written to .env.test and the temp file so the test
  // files and the in-process Medusa app stay aligned on the same broker.
  if (process.env.RABBITMQ_TEST_REUSE_URL === "1" && process.env.RABBITMQ_URL) {
    const url = process.env.RABBITMQ_URL
    fs.writeFileSync(URL_FILE, url)
    injectRabbitUrl(url)
    delete process.env.REDIS_URL
    delete process.env.CACHE_REDIS_URL
    delete process.env.EVENTS_REDIS_URL
    delete process.env.WE_REDIS_URL
    delete process.env.LOCKING_REDIS_URL
    console.info(`[testcontainers] Reusing external RabbitMQ at ${url}`)
    return
  }

  console.info("[testcontainers] Starting RabbitMQ container...")

  const container = await new RabbitMQContainer("rabbitmq:3.13-alpine").start()

  const url = container.getAmqpUrl()
  fs.writeFileSync(URL_FILE, url)
  fs.writeFileSync(CONTAINER_ID_FILE, container.getId())

  // Inject the testcontainer URL into .env.test so medusa-config.ts picks it up
  // (it loads .env.test with override=true when NODE_ENV=test)
  injectRabbitUrl(url)

  // Also set as env var (won't propagate to test files, but documents intent)
  process.env.RABBITMQ_URL = url

  // Clear Redis env vars from process.env so the in-process app doesn't try to
  // connect to Redis (loadEnv in jest.config.js already set these from .env.test,
  // and the app runs in-process so it reads process.env, not the modified file).
  delete process.env.REDIS_URL
  delete process.env.CACHE_REDIS_URL
  delete process.env.EVENTS_REDIS_URL
  delete process.env.WE_REDIS_URL
  delete process.env.LOCKING_REDIS_URL

  console.info(`[testcontainers] RabbitMQ ready at ${url}`)
}
