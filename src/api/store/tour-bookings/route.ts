import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import createTourBookingWorkflow from "../../../workflows/create-tour-booking"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const body = req.body as {
    bookings: Array<{
      tour_id: string
      tour_variant_id: string
      passenger_name: string
      passenger_email?: string
      passenger_phone?: string
      tour_date: string
      order_id: string
    }>
  }

  const { bookings } = body

  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return res.status(400).json({
      message: "bookings array is required and must contain at least one booking",
    })
  }

  for (const booking of bookings) {
    if (!booking.tour_id || !booking.tour_variant_id || !booking.passenger_name || !booking.tour_date || !booking.order_id) {
      return res.status(400).json({
        message: "Each booking must include tour_id, tour_variant_id, passenger_name, tour_date, and order_id",
      })
    }
  }

  const bookingsWithDates = bookings.map(b => ({
    ...b,
    tour_date: new Date(b.tour_date),
  }))

  const { result } = await createTourBookingWorkflow(req.scope).run({
    input: { bookings: bookingsWithDates },
  })

  res.json(result)
}
