import { model } from "@medusajs/framework/utils"
import { Package } from "./package"
import { PackageServiceVariant } from "./package-service-variant"
import PackageBooking from "./package-booking"

export enum PassengerType {
  ADULT = "adult",
  CHILD = "child",
  INFANT = "infant"
}

export const PackageVariant = model.define("package_variant", {
  id: model.id().primaryKey(),
  variant_id: model.text().unique(),
  passenger_type: model.enum(PassengerType),
  package: model.belongsTo(() => Package, {
    mappedBy: "variants",
  }),

  service_variant: model.belongsTo(() => PackageServiceVariant, {
    mappedBy: "prices",
  }).nullable(),
}).indexes([
  {
    on: ["package_id", "passenger_type"],
    unique: true,
  },
  {
    on: ["service_variant_id", "passenger_type"],
  },
])

export default PackageVariant
