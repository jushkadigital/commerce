import PackageModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PACKAGE_MODULE = "packageModule"

export default Module(PACKAGE_MODULE, {
  service: PackageModuleService,
})

export * from "./models/package"
export * from "./models/package-variant"
export * from "./models/package-booking"
export * from "./models/package-service-variant"
