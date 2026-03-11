import { model } from "@medusajs/framework/utils"

export const OrderNotificationRecipient = model.define("order_notification_recipient", {
  id: model.id().primaryKey(),
  email: model.text().unique(),
})

export default OrderNotificationRecipient
