import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TourModuleService from "../../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"


export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const body = req.body as {
      status: "pending" | "confirmed" | "cancelled" | "completed"
    }

    if (!body.status) {
      return res.status(400).json({
        message: "Missing required field: status",
      })
    }

    const validStatuses = ["pending", "confirmed", "cancelled", "completed"]
    if (!validStatuses.includes(body.status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      })
    }

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

    const currentBooking = await tourModuleService.retrieveTourBooking(id, {
      relations: ["tour", "tour_variant"],
    })

    if (!currentBooking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    await tourModuleService.updateTourBookings(
      { id },
      { status: body.status }
    )

    const updatedBooking = await tourModuleService.retrieveTourBooking(id, {
      relations: ["tour", "tour_variant"],
    })

    res.json({
      booking: { ...updatedBooking, type: "tour" },
      message: `Booking status updated to ${body.status}`,
    })
  } catch (error) {
    console.error("Error updating booking status:", error)
    res.status(500).json({
      message: "Failed to update booking status",
      error: error.message,
    })
  }
}
