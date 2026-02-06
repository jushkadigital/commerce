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
