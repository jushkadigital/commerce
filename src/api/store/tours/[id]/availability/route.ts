import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TourModuleService from "../../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const { date, quantity } = req.query

  if (!date || !quantity) {
    return res.status(400).json({
      message: "date and quantity are required query parameters",
    })
  }

  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

  const tourDate = new Date(date as string)
  const requestedQuantity = parseInt(quantity as string)

  const validation = await tourModuleService.validateBooking(
    id,
    tourDate,
    requestedQuantity
  )

  if (!validation.valid) {
    return res.status(400).json({
      available: false,
      reason: validation.reason,
    })
  }

  const availableCapacity = await tourModuleService.getAvailableCapacity(
    id,
    tourDate
  )

  res.json({
    available: true,
    capacity: availableCapacity,
  })
}
