import { model } from "@medusajs/framework/utils"
import { PackageVariant } from "./package-variant"
import { PackageBooking } from "./package-booking"
import { PackageServiceVariant } from "./package-service-variant"

export const Package = model.define("package", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),
  destination: model.text(),
  description: model.text().nullable(),
  duration_days: model.number(),
  max_capacity: model.number(),
  thumbnail: model.text().nullable(),
  available_dates: model.array(),
  is_special: model.boolean().default(false),
  blocked_dates: model.array().default([]),
  blocked_week_days: model.array().default([]),
  cancellation_deadline_hours: model.number().default(12),
  booking_min_months_ahead: model.number().default(2),
  variants: model.hasMany(() => PackageVariant, {
    mappedBy: "package",
  }),
  service_variants: model.hasMany(() => PackageServiceVariant, {
    mappedBy: "package",
  }),
  bookings: model.hasMany(() => PackageBooking, {
    mappedBy: "package",
  }),
}).indexes([
  {
    on: ["destination", "available_dates"],
  },
])

export default Package
