import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PACKAGE_MODULE } from "../../../../modules/package"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import PackageModuleService from "../../../../modules/package/service"


export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const booking = await packageModuleService.retrievePackageBooking(id, {
      relations: ["package", "package_variant"],
    })

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    let enrichedBooking: any = { ...booking }

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

    if ((booking as any).package_variant) {
      enrichedBooking.passenger_type = (booking as any).package_variant.passenger_type
    }

    res.json({ booking: enrichedBooking })
  } catch (error) {
    console.error("Error fetching package booking:", error)
    res.status(500).json({
      message: "Failed to fetch package booking",
      error: error.message,
    })
  }
}
