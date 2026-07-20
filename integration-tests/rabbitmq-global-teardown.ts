import { execSync } from "child_process"
import fs from "fs"
import path from "path"

const CONTAINER_ID_FILE = "/tmp/rabbitmq-container-id.txt"
const ENV_BACKUP_FILE = "/tmp/.env.test.backup"
const ENV_FILE = path.join(process.cwd(), ".env.test")

export default async function (): Promise<void> {
  try {
    const containerId = fs.readFileSync(CONTAINER_ID_FILE, "utf-8").trim()
    if (containerId) {
      console.info(`[testcontainers] Stopping RabbitMQ container ${containerId}...`)
      execSync(`docker stop ${containerId}`, { stdio: "ignore" })
      console.info("[testcontainers] RabbitMQ container stopped.")
    }
  } catch {
    // Container might already be stopped or Ryuk cleaned it up
    console.info("[testcontainers] RabbitMQ container already stopped or not found.")
  }

  // Restore .env.test from the backup (removes the RABBITMQ_URL line injected by global setup)
  try {
    if (fs.existsSync(ENV_BACKUP_FILE)) {
      const backup = fs.readFileSync(ENV_BACKUP_FILE, "utf-8")
      if (backup === "__NO_FILE__") {
        try { fs.unlinkSync(ENV_FILE) } catch { /* ignore */ }
      } else {
        fs.writeFileSync(ENV_FILE, backup)
      }
      fs.unlinkSync(ENV_BACKUP_FILE)
    }
  } catch {
    // Non-fatal: .env.test might be left with the testcontainer URL
  }

  // Clean up temp files
  try { fs.unlinkSync("/tmp/rabbitmq-test-url.txt") } catch { /* ignore */ }
  try { fs.unlinkSync(CONTAINER_ID_FILE) } catch { /* ignore */ }
}
