import { model } from "@medusajs/framework/utils"
import { Tour } from "./tour"
import { TourServiceVariant } from "./tour-service-variant"
import TourBooking from "./tour-booking"

export enum PassengerType {
  ADULT = "adult",
  CHILD = "child",
  INFANT = "infant"
}

export const TourVariant = model.define("tour_variant", {
  id: model.id().primaryKey(),
  variant_id: model.text().unique(), // Product Variant ID from Medusa
  passenger_type: model.enum(PassengerType),
  // Prices are now managed by Medusa's Pricing Module
  tour: model.belongsTo(() => Tour, {
    mappedBy: "variants",
  }),

  service_variant: model.belongsTo(() => TourServiceVariant, {
    mappedBy: "prices",
  }).nullable(),
}).indexes([
  {
    on: ["tour_id", "passenger_type"],
    unique: true,
  },
  {
    on: ["service_variant_id", "passenger_type"],
  },
])

export default TourVariant
