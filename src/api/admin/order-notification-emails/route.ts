import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { ORDER_NOTIFICATION_MODULE } from "../../../modules/order-notification"

type OrderNotificationRecipientRecord = {
  id: string
  email: string
}

type OrderNotificationModuleApi = {
  listOrderNotificationRecipients: (filters?: Record<string, unknown>) => Promise<OrderNotificationRecipientRecord[]>
  createOrderNotificationRecipients: (
    payload: { email: string } | Array<{ email: string }>
  ) => Promise<OrderNotificationRecipientRecord | OrderNotificationRecipientRecord[]>
}

export const CreateOrderNotificationEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export type CreateOrderNotificationEmailType = z.infer<
  typeof CreateOrderNotificationEmailSchema
>

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderNotificationModuleService = req.scope.resolve(
    ORDER_NOTIFICATION_MODULE
  ) as OrderNotificationModuleApi

  const recipients = await orderNotificationModuleService.listOrderNotificationRecipients()
  const sortedRecipients = [...recipients].sort((a, b) =>
    a.email.localeCompare(b.email)
  )

  res.json({
    emails: sortedRecipients,
    count: sortedRecipients.length,
  })
}

export async function POST(
  req: MedusaRequest<CreateOrderNotificationEmailType>,
  res: MedusaResponse
) {
  const orderNotificationModuleService = req.scope.resolve(
    ORDER_NOTIFICATION_MODULE
  ) as OrderNotificationModuleApi

  const normalizedEmail = req.validatedBody.email.trim().toLowerCase()

  const existingRecipients =
    await orderNotificationModuleService.listOrderNotificationRecipients({
      email: normalizedEmail,
    })

  if (existingRecipients.length > 0) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Email ${normalizedEmail} is already registered for notifications`
    )
  }

  const createdRecipient =
    await orderNotificationModuleService.createOrderNotificationRecipients({
      email: normalizedEmail,
    })

  const recipient = Array.isArray(createdRecipient)
    ? createdRecipient[0]
    : createdRecipient

  res.status(201).json({
    email: recipient,
  })
}
