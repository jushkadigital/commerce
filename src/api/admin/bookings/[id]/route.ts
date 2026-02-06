import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TOUR_MODULE } from "../../../../modules/tour"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import TourModuleService from "../../../../modules/tour/service"


export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const booking = await tourModuleService.retrieveTourBooking(id, {
      relations: ["tour", "tour_variant"],
    })

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    let enrichedBooking: any = { ...booking, type: "tour" }

    if (booking.order_id) {
      try {
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "display_id",
            "status",
            "payment_status",
            "fulfillment_status",
            "total",
            "currency_code",
            "created_at",
            "customer.id",
            "customer.first_name",
            "customer.last_name",
            "customer.email",
          ],
          filters: {
            id: booking.order_id,
          },
        })

        if (orders && orders.length > 0) {
          enrichedBooking.order = orders[0]
        }
      } catch (orderError) {
        console.error("Error fetching order:", orderError)
      }
    }

    if ((booking as any).tour_variant) {
      enrichedBooking.passenger_type = (booking as any).tour_variant.passenger_type
    }

    res.json({ booking: enrichedBooking })
  } catch (error) {
    console.error("Error fetching booking:", error)
    res.status(500).json({
      message: "Failed to fetch booking",
      error: error.message,
    })
  }
}
