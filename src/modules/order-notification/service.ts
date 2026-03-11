import { MedusaService } from "@medusajs/framework/utils"
import OrderNotificationRecipient from "./models/order-notification-recipient"

class OrderNotificationModuleService extends MedusaService({
  OrderNotificationRecipient,
}) {}

export default OrderNotificationModuleService
