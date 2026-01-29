import PackageModule from "../modules/package"
import OrderModule from "@medusajs/medusa/order"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: PackageModule.linkable.packageBooking,
    deleteCascade: true,
    isList: true,
  },
  OrderModule.linkable.order
)
