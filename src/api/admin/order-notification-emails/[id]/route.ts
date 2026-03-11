import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ORDER_NOTIFICATION_MODULE } from "../../../../modules/order-notification"

type OrderNotificationRecipientRecord = {
  id: string
  email: string
}

type OrderNotificationModuleApi = {
  listOrderNotificationRecipients: (filters?: Record<string, unknown>) => Promise<OrderNotificationRecipientRecord[]>
  deleteOrderNotificationRecipients: (id: string | string[]) => Promise<void>
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const orderNotificationModuleService = req.scope.resolve(
    ORDER_NOTIFICATION_MODULE
  ) as OrderNotificationModuleApi

  const recipients = await orderNotificationModuleService.listOrderNotificationRecipients({
    id,
  })

  if (recipients.length === 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Notification email not found")
  }

  await orderNotificationModuleService.deleteOrderNotificationRecipients(id)

  res.json({
    id,
    deleted: true,
  })
}
