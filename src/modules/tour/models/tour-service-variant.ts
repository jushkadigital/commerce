import { model } from "@medusajs/framework/utils"
import { Tour } from "./tour"
import { TourVariant } from "./tour-variant"

export const TourServiceVariant = model.define("tour_service_variant", {
  id: model.id().primaryKey(),
  title: model.text(), // nombre del servicio (ej: "Tour Básico", "Tour Premium", "Tour VIP")
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
  tour: model.belongsTo(() => Tour, {
    mappedBy: "service_variants",
  }),
  prices: model.hasMany(() => TourVariant, {
    mappedBy: "service_variant",
  }),
})

export default TourServiceVariant
