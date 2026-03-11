import type { SubscriberArgs } from "@medusajs/medusa"
import { ORDER_NOTIFICATION_MODULE } from "../modules/order-notification"

type OrderNotificationRecipientRecord = {
  email: string
}

type OrderNotificationModuleApi = {
  listOrderNotificationRecipients: () => Promise<OrderNotificationRecipientRecord[]>
}

type ResolveContainer = SubscriberArgs["container"]

function readEmailsFromEnv(): string[] {
  const raw = process.env.ORDER_NOTIFICATION_EMAILS
  if (!raw) {
    return []
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
}

export async function getOrderNotificationEmails(container: ResolveContainer): Promise<string[]> {
  const moduleService = container.resolve(
    ORDER_NOTIFICATION_MODULE
  ) as OrderNotificationModuleApi

  try {
    const recipients = await moduleService.listOrderNotificationRecipients()
    const emails = recipients
      .map((recipient) => recipient.email.trim().toLowerCase())
      .filter((email) => email.length > 0)

    if (emails.length > 0) {
      return emails
    }
  } catch (error) {
    const logger = container.resolve("logger")
    logger.warn(
      `Failed loading order notification emails from module: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return readEmailsFromEnv()
}
