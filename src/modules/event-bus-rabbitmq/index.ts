// src/modules/event-bus-rabbitmq/index.ts
import { Module } from "@medusajs/utils"
import RabbitMQEventBusService from "./service"

export const RABBITMQ_EVENT_BUS_MODULE = "eventBusRabbitMQ"

export default Module(RABBITMQ_EVENT_BUS_MODULE, {
  service: RabbitMQEventBusService,
})
