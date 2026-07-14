import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import handleOrderPlaced from "../subscribers/order-placed"

export default async function testBookingFlow({ container }: ExecArgs) {
  const divider = "======================================"


  const tourModuleService = container.resolve(TOUR_MODULE) as TourModuleService
  const orderModuleService = container.resolve(Modules.ORDER)

  const testTourDate = "2026-03-15T10:00:00Z"
  const testPassengers = [
    { name: "Test Passenger", type: "adult", passport: "TEST123" },
    { name: "Child Passenger", type: "child", passport: "TEST456" },
  ]

  try {

    let tour: any
    const existingTours = await tourModuleService.listTours({}, { take: 1 })

    if (existingTours.length > 0) {
      tour = existingTours[0]
    } else {
      tour = await tourModuleService.createTours({
        product_id: `test_product_${Date.now()}`,
        destination: "Test Destination",
        duration_days: 3,
        max_capacity: 20,
      })
    }


    const tourMetadata = {
      is_tour: true,
      tour_id: tour.id,
      tour_date: testTourDate,
      passengers: testPassengers,
    }

    const [createdOrder] = await (orderModuleService as any).createOrders([
      {
        currency_code: "usd",
        items: [
          {
            title: `Tour: ${tour.destination} - 2026-03-15`,
            quantity: 1,
            unit_price: 300,
            metadata: tourMetadata,
          },
        ],
      },
    ])

    const orderId = createdOrder.id


    await handleOrderPlaced({
      event: {
        data: { id: orderId },
        name: "order.placed",
        metadata: {},
      },
      container,
      pluginOptions: {},
    } as any)



    const bookings = await tourModuleService.listTourBookings({
      order_id: orderId,
    })

    if (bookings.length === 0) {
      throw new Error(
        `No TourBooking records found for order ${orderId}. ` +
          "The subscriber may not have processed the order correctly."
      )
    }

    const booking = bookings[0]
    const lineItems = booking.line_items as any

    const checks: Array<{ label: string; ok: boolean; detail: string }> = [
      {
        label: "Order ID matches",
        ok: booking.order_id === orderId,
        detail: `expected=${orderId} got=${booking.order_id}`,
      },
      {
        label: "Tour ID matches",
        ok: booking.tour_id === tour.id,
        detail: `expected=${tour.id} got=${booking.tour_id}`,
      },
      {
        label: "Tour date matches",
        ok:
          new Date(booking.tour_date).toISOString() ===
          new Date(testTourDate).toISOString(),
        detail: `expected=${testTourDate} got=${new Date(booking.tour_date).toISOString()}`,
      },
      {
        label: "Status is pending",
        ok: booking.status === "pending",
        detail: `expected=pending got=${booking.status}`,
      },
      {
        label: "Passengers stored",
        ok:
          Array.isArray(lineItems?.passengers) &&
          lineItems.passengers.length === testPassengers.length,
        detail: `expected=${testPassengers.length} passengers, got=${lineItems?.passengers?.length ?? 0}`,
      },
    ]

    let allPassed = true
    for (const check of checks) {
      if (check.ok) {
      } else {
        allPassed = false
      }
    }

    if (!allPassed) {
      throw new Error("One or more booking verification checks failed.")
    }

    await handleOrderPlaced({
      event: {
        data: { id: orderId },
        name: "order.placed",
        metadata: {},
      },
      container,
      pluginOptions: {},
    } as any)

    const bookingsAfterRetry = await tourModuleService.listTourBookings({
      order_id: orderId,
    })

    if (bookingsAfterRetry.length === bookings.length) {
      // Idempotency verified
    } else {
      throw new Error("Idempotency check failed - duplicate bookings created!")
    }

  } catch (error) {
    console.error("")
    console.error(divider)
    console.error("❌ TEST FAILED")
    console.error(divider)
    console.error(error)
    process.exit(1)
  }
}
