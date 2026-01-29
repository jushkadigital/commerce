import PackageModule from "../modules/package"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: PackageModule.linkable.packageVariant,
    deleteCascade: true,
  },
  ProductModule.linkable.productVariant
)
