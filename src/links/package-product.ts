import PackageModule from "../modules/package"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: PackageModule.linkable.package,
    deleteCascade: true,
  },
  ProductModule.linkable.product
)
