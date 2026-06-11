import { Module, Modules } from "@medusajs/framework/utils"
import RabbitMQEventBusService from "./service"
import loader from "./loader"

export const EVENT_BUS_RABBITMQ = Modules.EVENT_BUS

export default Module(EVENT_BUS_RABBITMQ, {
  service: RabbitMQEventBusService,
  loaders: [loader] as any,
})
