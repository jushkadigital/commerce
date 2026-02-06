import TourModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const TOUR_MODULE = "tourModule"

export default Module(TOUR_MODULE, {
  service: TourModuleService,
})

export * from "./models/tour"
export * from "./models/tour-variant"
export * from "./models/tour-booking"
export * from "./models/tour-service-variant"
