import { Module } from "@medusajs/framework/utils"
import EventModuleService from "./service"
import type { EventsModuleOptions } from "./service"

export const EVENTS_MODULE = "eventsModule"

export default Module(EVENTS_MODULE, {
  service: EventModuleService,
})

export { EventModuleService, EventsModuleOptions }
