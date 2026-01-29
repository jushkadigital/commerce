import { model } from "@medusajs/framework/utils"
import { Package } from "./package"
import { PackageVariant } from "./package-variant"

export const PackageServiceVariant = model.define("package_service_variant", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
  package: model.belongsTo(() => Package, {
    mappedBy: "service_variants",
  }),
  prices: model.hasMany(() => PackageVariant, {
    mappedBy: "service_variant",
  }),
})

export default PackageServiceVariant
