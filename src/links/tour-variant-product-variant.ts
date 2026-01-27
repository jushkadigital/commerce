import TourModule from "../modules/tour-booking"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

/**
 * Link between TourVariant and ProductVariant
 * - deleteCascade: TourVariant is deleted when its linked ProductVariant is deleted
 */
export default defineLink(
  {
    linkable: TourModule.linkable.tourVariant,
    deleteCascade: true,
  },
  ProductModule.linkable.productVariant
)
