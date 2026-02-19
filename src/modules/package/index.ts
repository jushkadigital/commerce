import PackageModuleService from "./service"
import { Module } from "@medusajs/framework/utils"
import Package from "./models/package"
import PackageVariant from "./models/package-variant"
import PackageBooking from "./models/package-booking"
import PackageServiceVariant from "./models/package-service-variant"

export const PACKAGE_MODULE = "packageModule"

export default Module(PACKAGE_MODULE, {
  service: PackageModuleService,
})

export * from "./models/package"
export * from "./models/package-variant"
export * from "./models/package-booking"
export * from "./models/package-service-variant"

export const linkable = {
  package: Package,
  packageVariant: PackageVariant,
  packageBooking: PackageBooking,
  packageServiceVariant: PackageServiceVariant,
}
