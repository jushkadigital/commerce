import IzipayModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const IZIPAY_MODULE = "izipay"

export default Module(IZIPAY_MODULE, {
  service: IzipayModuleService,
})
