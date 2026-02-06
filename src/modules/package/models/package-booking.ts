import { model } from "@medusajs/framework/utils"
import { Package } from "./package"
import { PackageVariant } from "./package-variant"

export const PackageBooking = model.define("package_booking", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  package: model.belongsTo(() => Package),
  line_items: model.json().nullable(),
  package_date: model.dateTime(),
  status: model.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
}).indexes([
  {
    on: ["order_id"],
  }
])

export default PackageBooking
