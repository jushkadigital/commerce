import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TourModuleService from "../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../modules/tour-booking"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const query = req.scope.resolve("query")
  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

  const {
    data: [tour],
  } = await query.graph({
    entity: "tour",
    fields: req.queryConfig?.fields || [
      "id",
      "destination",
      "description",
      "duration_days",
      "max_capacity",
      "available_dates",
      "product_id",
      "variants.*",
    ],
    filters: { id },
  })

  if (!tour) {
    return res.status(404).json({ message: "Tour not found" })
  }

  const pricing = await tourModuleService.getTourPricing(tour.id)

  // Filtrar fechas pasadas y obtener capacidad disponible
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureDates = (tour.available_dates || []).filter((date: string) => {
    const dateObj = new Date(date)
    dateObj.setHours(0, 0, 0, 0)
    return dateObj >= today
  })

  const datesWithCapacity = await Promise.all(
    futureDates.map(async (date: string) => {
      const capacity = await tourModuleService.getAvailableCapacity(
        tour.id,
        new Date(date)
      )
      return {
        date,
        available_capacity: capacity,
      }
    })
  )

  res.json({
    tour: {
      ...tour,
      available_dates: datesWithCapacity,
      prices: pricing.prices,
    },
  })
}
