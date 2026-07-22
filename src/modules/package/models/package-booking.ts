import { model } from "@medusajs/framework/utils"
import { Package } from "./package"

export const PackageBooking = model.define("package_booking", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  package: model.belongsTo(() => Package),
  line_items: model.json().nullable(),
  metadata: model.json().nullable(),
  package_date: model.dateTime(),
  status: model.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  reserved_passengers: model.number().default(0),
}).indexes([
  {
    on: ["order_id"],
  },
  {
    on: ["package_id", "package_date", "status"],
  },
])

export default PackageBooking
