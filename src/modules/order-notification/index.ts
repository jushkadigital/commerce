import { Module } from "@medusajs/framework/utils"
import OrderNotificationModuleService from "./service"

export const ORDER_NOTIFICATION_MODULE = "orderNotificationModule"

export default Module(ORDER_NOTIFICATION_MODULE, {
  service: OrderNotificationModuleService,
})

export * from "./models/order-notification-recipient"
