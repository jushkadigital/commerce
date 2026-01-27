import { model } from "@medusajs/framework/utils"
import { TourVariant } from "./tour-variant"
import { TourBooking } from "./tour-booking"
import { TourServiceVariant } from "./tour-service-variant"

export const Tour = model.define("tour", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),
  destination: model.text(),
  description: model.text().nullable(),
  duration_days: model.number(),
  max_capacity: model.number(),
  thumbnail: model.text().nullable(),
  available_dates: model.array(),
  variants: model.hasMany(() => TourVariant, {
    mappedBy: "tour",
  }),
  service_variants: model.hasMany(() => TourServiceVariant, {
    mappedBy: "tour",
  }),
  bookings: model.hasMany(() => TourBooking, {
    mappedBy: "tour",
  }),
}).indexes([
  {
    on: ["destination", "available_dates"],
  },
])

export default Tour
