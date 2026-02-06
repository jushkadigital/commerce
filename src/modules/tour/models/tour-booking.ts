import { model } from "@medusajs/framework/utils"
import { Tour } from "./tour"
import { TourVariant } from "./tour-variant"

export const TourBooking = model.define("tour_booking", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  tour: model.belongsTo(() => Tour),
  line_items: model.json().nullable(),
  tour_date: model.dateTime(),
  status: model.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
}).indexes([
  {
    on: ["order_id"],
  }
])

export default TourBooking
