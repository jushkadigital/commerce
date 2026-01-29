import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import PackageModuleService from "../../../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../../../modules/package"


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

    const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)

    const currentBooking = await packageModuleService.retrievePackageBooking(id, {
      relations: ["package", "package_variant"],
    })

    if (!currentBooking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    await packageModuleService.updatePackageBookings(
      { id },
      { status: body.status }
    )

    const updatedBooking = await packageModuleService.retrievePackageBooking(id, {
      relations: ["package", "package_variant"],
    })

    res.json({
      booking: updatedBooking,
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
