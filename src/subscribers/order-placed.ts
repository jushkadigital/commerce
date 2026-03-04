import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import { findExistingBooking } from "../utils/booking-idempotency"
import { resend } from "../utils/email"

export default async function handleOrderPlaced({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderId = event.data.id

  try {
    const existingBookings = await findExistingBooking(orderId, container)
    if (existingBookings.length > 0) {
      logger.info(
        `[order.placed] Bookings already exist for order ${orderId}, skipping (idempotent).`
      )
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "items.*"],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[order.placed] Order ${orderId} not found.`)
      return
    }

    const tourItems = (order.items || []).filter(
      (item: any) => item.metadata?.is_tour === true
    )

    if (tourItems.length === 0) {
      logger.info(
        `[order.placed] Order ${orderId} has no tour items, skipping.`
      )
      return
    }

    const tourModuleService = container.resolve(
      TOUR_MODULE
    ) as TourModuleService

    const bookingsToCreate = tourItems.map((item: any) => ({
      order_id: orderId,
      tour_id: item.metadata.tour_id,
      tour_date: new Date(item.metadata.tour_date),
      status: "pending" as const,
      metadata:
        typeof item.metadata?.group_id === "string"
          ? { group_id: item.metadata.group_id }
          : undefined,
      line_items: {
        item_id: item.id,
        variant_id: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        passengers: item.metadata.passengers || [],
      },
    }))

    const createdBookingsRaw =
      await tourModuleService.createTourBookings(bookingsToCreate)
    // createdBookingsRaw might be a single object or an array depending on implementation
    const createdBookings = Array.isArray(createdBookingsRaw)
      ? createdBookingsRaw
      : [createdBookingsRaw]

    logger.info(
      `[order.placed] Created ${createdBookings.length} tour booking(s) for order ${orderId}: ${createdBookings.map((b: any) => b.id).join(", ")}`
    )

    // Send notification emails for each created booking. Failures are logged
    // and do not interrupt the subscriber flow.
    for (const booking of createdBookings) {
      try {
        // Ensure TypeScript understands this is an array; bookings may come as loose objects
        const passengersArr = (booking.line_items?.passengers as any[]) || []
        const passengersHtml = Array.isArray(passengersArr) ? passengersArr
          .map((p: any) => {
            const passport = p.passport ? ` - Passport: ${p.passport}` : ""
            return `${p.name} (${p.type})${passport}`
          })
          .join("</li><li>") : ""

        const formattedDate = booking.tour_date
          ? new Date(booking.tour_date).toISOString()
          : ""

        const subject = `New Tour Booking - Order #${orderId}`

        const html = `<h2>New Tour Booking</h2>
<p><strong>Order ID:</strong> ${orderId}</p>
<p><strong>Tour ID:</strong> ${booking.tour_id}</p>
<p><strong>Tour Date:</strong> ${formattedDate}</p>
<h3>Passengers:</h3>
<ul><li>${passengersHtml}</li></ul>`

        // Placeholder addresses per plan. Do not throw on failure.
        // Resend SDK returns an object with { data, error }.
        // Await the send call and log result.
        if (resend) {
          const res = await resend.emails.send({
            from: "bookings@yourdomain.com",
            to: ["operator@example.com"],
            subject,
            html,
          })

          if (res?.error) {
            logger.error(`Failed to send email for booking ${booking.id}:`, res.error)
          } else {
            logger.info(`Email sent for booking ${booking.id}`)
          }
        } else {
          logger.warn(`Resend client not initialized, skipping email for booking ${booking.id}`)
        }
      } catch (error) {
        logger.error(`Failed to send email for booking ${booking.id}:`, error)
      }
    }
  } catch (error) {
    console.error(
      `[order.placed] Failed to create tour bookings for order ${orderId}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
