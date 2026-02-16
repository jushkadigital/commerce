import TourModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import Tour from "./models/tour"
import TourVariant from "./models/tour-variant"
import TourBooking from "./models/tour-booking"
import TourServiceVariant from "./models/tour-service-variant"

export const TOUR_MODULE = "tourModule"

export default Module(TOUR_MODULE, {
  service: TourModuleService,
})

export * from "./models/tour"
export * from "./models/tour-variant"
export * from "./models/tour-booking"
export * from "./models/tour-service-variant"

export const linkable = {
  tour: Tour,
  tourVariant: TourVariant,
  tourBooking: TourBooking,
  tourServiceVariant: TourServiceVariant,
}
