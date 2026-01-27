import TourModule from "../modules/tour-booking"
import OrderModule from "@medusajs/medusa/order"
import { defineLink } from "@medusajs/framework/utils"

/**
 * Link between TourBooking and Order
 * - deleteCascade: TourBooking is deleted when its linked Order is deleted
 * - isList: An order can have multiple tour bookings (multiple passengers)
 */
export default defineLink(
  {
    linkable: TourModule.linkable.tourBooking,
    deleteCascade: true,
    isList: true,
  },
  OrderModule.linkable.order
)
