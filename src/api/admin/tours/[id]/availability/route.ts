import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthenticatedMedusaRequest } from "@medusajs/framework"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"
import TourModuleService from "../../../../../modules/tour-booking/service"
import { GetTourAvailabilityParams, GetTourAvailabilityParamsSchema } from "./validators"

/**
 * GET /admin/tours/:id/availability
 * Returns tour availability for a given date range
 * Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const tour_id = req.params.id
  const { start_date, end_date } = req.validatedQuery as GetTourAvailabilityParams

  // Validate date range
  if (start_date > end_date) {
    return res.status(400).json({
      message: "start_date must be before or equal to end_date",
    })
  }

  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

  // Get tour details to verify it exists and get capacity
  const tour = await tourModuleService.retrieveTour(tour_id, {
    select: ["id", "max_capacity"],
  })

  if (!tour) {
    return res.status(404).json({
      message: "Tour not found",
    })
  }

  const capacity = tour.max_capacity || 0

  // Query bookings for the date range
  const query = req.scope.resolve("query")
  const bookingsQuery = await query.graph({
    entity: "tour_booking",
    fields: ["tour_date", "status"],
    filters: {
      tour_id,
      tour_date: {
        $gte: start_date,
        $lte: end_date,
      },
      status: {
        $ne: "cancelled",
      },
    },
  })

  const bookings = bookingsQuery.data || []

  // Calculate availability for each day
  const availability: Array<{
    date: string
    total: number
    booked: number
    available: number
  }> = []

  // Generate all dates in range
  const current = new Date(start_date)
  const end = new Date(end_date)
  end.setHours(23, 59, 59, 999)

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]

    // Count bookings for this day (confirmed or pending)
    const dayBookings = bookings.filter(
      (booking: any) =>
        booking.tour_date &&
        booking.tour_date instanceof Date &&
        booking.tour_date.toDateString() === current.toDateString() &&
        booking.status !== "cancelled"
    )

    const booked = dayBookings.reduce(
      (sum: number, booking: any) => sum + (booking.quantity || 1),
      0
    )

    availability.push({
      date: dateStr,
      total: capacity,
      booked,
      available: Math.max(0, capacity - booked),
    })

    current.setDate(current.getDate() + 1)
  }

  res.json({
    tour_id: tour.id,
    capacity,
    availability,
  })
}
