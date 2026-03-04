import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import { findExistingPackageBooking } from "../utils/package-booking-idempotency"
import { resend } from "../utils/email"

export default async function handlePackageOrderPlaced({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderId = event.data.id

  try {
    const existingBookings = await findExistingPackageBooking(orderId, container)
    if (existingBookings.length > 0) {
      logger.info(
        `[order.placed] Package bookings already exist for order ${orderId}, skipping (idempotent).`
      )
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "items.*"],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[order.placed] Order ${orderId} not found.`)
      return
    }

    const packageItems = (order.items || []).filter(
      (item: any) => item.metadata?.is_package === true
    )

    if (packageItems.length === 0) {
      logger.info(
        `[order.placed] Order ${orderId} has no package items, skipping.`
      )
      return
    }

    const packageModuleService = container.resolve(
      PACKAGE_MODULE
    ) as PackageModuleService

    const bookingsToCreate = packageItems.map((item: any) => ({
      order_id: orderId,
      package_id: item.metadata.package_id,
      package_date: new Date(item.metadata.package_date),
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
      await packageModuleService.createPackageBookings(bookingsToCreate)
    const createdBookings = Array.isArray(createdBookingsRaw)
      ? createdBookingsRaw
      : [createdBookingsRaw]

    logger.info(
      `[order.placed] Created ${createdBookings.length} package booking(s) for order ${orderId}: ${createdBookings
        .map((b: any) => b.id)
        .join(", ")}`
    )

    for (const booking of createdBookings) {
      try {
        const passengersArr = (booking.line_items?.passengers as any[]) || []
        const passengersHtml = Array.isArray(passengersArr)
          ? passengersArr
              .map((p: any) => {
                const passport = p.passport ? ` - Passport: ${p.passport}` : ""
                return `${p.name} (${p.type})${passport}`
              })
              .join("</li><li>")
          : ""

        const formattedDate = booking.package_date
          ? new Date(booking.package_date).toISOString()
          : ""

        const subject = `New Package Booking - Order #${orderId}`

        const html = `<h2>New Package Booking</h2>
<p><strong>Order ID:</strong> ${orderId}</p>
<p><strong>Package ID:</strong> ${booking.package_id}</p>
<p><strong>Package Date:</strong> ${formattedDate}</p>
<h3>Passengers:</h3>
<ul><li>${passengersHtml}</li></ul>`

        if (resend) {
          const emailResult = await resend.emails.send({
            from: "bookings@yourdomain.com",
            to: ["operator@example.com"],
            subject,
            html,
          })

          if (emailResult?.error) {
            logger.error(
              `Failed to send email for package booking ${booking.id}:`,
              emailResult.error
            )
          } else {
            logger.info(`Email sent for package booking ${booking.id}`)
          }
        } else {
          logger.warn(
            `Resend client not initialized, skipping email for package booking ${booking.id}`
          )
        }
      } catch (error) {
        logger.error(`Failed to send email for package booking ${booking.id}:`, error)
      }
    }
  } catch (error) {
    console.error(
      `[order.placed] Failed to create package bookings for order ${orderId}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
