import TourModule from "../modules/tour-booking"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

/**
 * Link between Tour and Product
 * - deleteCascade: Tour is deleted when its linked Product is deleted
 */
export default defineLink(
  {
    linkable: TourModule.linkable.tour,
    deleteCascade: true,
  },
  ProductModule.linkable.product
)
