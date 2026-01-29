import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TourModuleService from "../../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"
import PackageModuleService from "../../../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../../../modules/package"


export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { type } = req.query
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

    if (type === "package") {
      return await updatePackageBookingStatus(req, res, id, body.status)
    } else {
      return await updateTourBookingStatus(req, res, id, body.status)
    }
  } catch (error) {
    console.error("Error updating booking status:", error)
    res.status(500).json({
      message: "Failed to update booking status",
      error: error.message,
    })
  }
}


async function updateTourBookingStatus(req: MedusaRequest, res: MedusaResponse, id: string, status: string) {
  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

  const currentBooking = await tourModuleService.retrieveTourBooking(id, {
    relations: ["tour", "tour_variant"],
  })

  if (!currentBooking) {
    return res.status(404).json({ message: "Booking not found" })
  }

  await tourModuleService.updateTourBookings(
    { id },
    { status }
  )

  const updatedBooking = await tourModuleService.retrieveTourBooking(id, {
    relations: ["tour", "tour_variant"],
  })

  res.json({
    booking: { ...updatedBooking, type: "tour" },
    message: `Booking status updated to ${status}`,
  })
}


async function updatePackageBookingStatus(req: MedusaRequest, res: MedusaResponse, id: string, status: string) {
  const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)

  const currentBooking = await packageModuleService.retrievePackageBooking(id, {
    relations: ["package", "package_variant"],
  })

  if (!currentBooking) {
    return res.status(404).json({ message: "Booking not found" })
  }

  await packageModuleService.updatePackageBookings(
    { id },
    { status }
  )

  const updatedBooking = await packageModuleService.retrievePackageBooking(id, {
    relations: ["package", "package_variant"],
  })

  res.json({
    booking: { ...updatedBooking, type: "package" },
    message: `Booking status updated to ${status}`,
  })
}
