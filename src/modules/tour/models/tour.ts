import { model } from "@medusajs/framework/utils"
import { TourVariant } from "./tour-variant"
import { TourBooking } from "./tour-booking"
import { TourServiceVariant } from "./tour-service-variant"

export const Tour = model.define("tour", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),
  slug: model.text().unique(),
  destination: model.text(),
  description: model.text().nullable(),
  duration_days: model.number(),
  max_capacity: model.number(),
  thumbnail: model.text().nullable(),
  is_special: model.boolean().default(false),
  blocked_dates: model.array().default([]),
  blocked_week_days: model.array().default([]),
  cancellation_deadline_hours: model.number().default(12),
  booking_min_days_ahead: model.number().default(2),
  metadata: model.json().nullable(),
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
    on: ["destination"],
  },
  {
    on: ["slug"],
  },
])

export default Tour
