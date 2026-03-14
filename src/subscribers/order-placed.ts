import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import { findExistingBooking } from "../utils/booking-idempotency"
import { resend } from "../utils/email"
import { getOrderNotificationEmails } from "../utils/order-notification-emails"
import { TravelBookingNotificationEmail } from "../emails/travel-booking-notification"

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
      fields: [
        "id",
        "display_id",
        "email",
        "metadata",
        "currency_code",
        "total",
        "items.*",
        "customer.first_name",
        "customer.last_name",
        "customer.email",
      ],
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

    const orderPreDataRaw =
      order?.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, any>).preData
        : undefined
    const orderPreData = orderPreDataRaw == null ? undefined : orderPreDataRaw

    const bookingsToCreate = tourItems.map((item: any) => {
      const bookingMetadata: Record<string, any> = {}

      if (typeof item.metadata?.group_id === "string") {
        bookingMetadata.group_id = item.metadata.group_id
      }

      if (orderPreData !== undefined) {
        bookingMetadata.preData = structuredClone(orderPreData)
      }

      return {
        order_id: orderId,
        tour_id: item.metadata.tour_id,
        tour_date: new Date(item.metadata.tour_date),
        status: "pending" as const,
        metadata: Object.keys(bookingMetadata).length > 0 ? bookingMetadata : undefined,
        line_items: {
          item_id: item.id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          passengers: item.metadata.passengers || [],
        },
      }
    })

    const createdBookingsRaw =
      await tourModuleService.createTourBookings(bookingsToCreate)
    // createdBookingsRaw might be a single object or an array depending on implementation
    const createdBookings = Array.isArray(createdBookingsRaw)
      ? createdBookingsRaw
      : [createdBookingsRaw]

    logger.info(
      `[order.placed] Created ${createdBookings.length} tour booking(s) for order ${orderId}: ${createdBookings.map((b: any) => b.id).join(", ")}`
    )

    const notificationRecipients = await getOrderNotificationEmails(container)

    if (notificationRecipients.length === 0) {
      logger.warn(
        "No order notification recipients configured. Will send only customer email for order.placed."
      )
    }

    const customerEmailRaw =
      (typeof order.email === "string" && order.email) ||
      (typeof order.customer?.email === "string" && order.customer.email) ||
      null
    const customerEmail =
      typeof customerEmailRaw === "string" && customerEmailRaw.trim().length > 0
        ? customerEmailRaw.trim()
        : null

    const customerFirstName =
      typeof order.customer?.first_name === "string"
        ? order.customer.first_name.trim()
        : ""
    const customerLastName =
      typeof order.customer?.last_name === "string"
        ? order.customer.last_name.trim()
        : ""
    const customerName =
      [customerFirstName, customerLastName].filter(Boolean).join(" ") || "Viajero"

    if (!customerEmail) {
      logger.warn(
        `Customer email not found for order ${orderId}. Skipping customer notification email.`
      )
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "bookings@yourdomain.com"

    const customerBookableItems = (order.items || []).filter(
      (item: any) => item.metadata?.is_tour === true || item.metadata?.is_package === true
    )
    const hasPackageItemsForCustomer = customerBookableItems.some(
      (item: any) => item.metadata?.is_package === true
    )
    const customerReservationType: "Tour" | "Package" | "Mixed" = hasPackageItemsForCustomer
      ? "Mixed"
      : "Tour"

    const customerCartItems = customerBookableItems.map((item: any) => {
      const rawQuantity = Number(item.quantity)
      const quantity = Number.isFinite(rawQuantity) ? Math.max(0, rawQuantity) : 0

      const rawTotal = [item.total, item.subtotal, item.unit_price]
        .map((value) => Number(value))
        .find((value) => Number.isFinite(value))

      const destinationRaw =
        item.metadata?.tour_destination ?? item.metadata?.package_destination ?? item.title
      const destination = typeof destinationRaw === "string" ? destinationRaw : null

      return {
        groupId: typeof item.metadata?.group_id === "string" ? item.metadata.group_id : null,
        name: destination,
        date: item.metadata?.tour_date ?? item.metadata?.package_date ?? null,
        quantity,
        total: rawTotal ?? 0,
        imageUrl: typeof item.thumbnail === "string" ? item.thumbnail : null,
      }
    })

    const customerPassengers = customerBookableItems.flatMap((item: any) =>
      Array.isArray(item.metadata?.passengers) ? item.metadata.passengers : []
    )
    const bookingReference =
      createdBookings
        .map((booking: any) => String(booking?.id || ""))
        .filter((bookingId: string) => bookingId.length > 0)
        .join(", ") || "N/A"

    if (resend && customerEmail) {
      try {
        const customerSubject = hasPackageItemsForCustomer
          ? `Nueva reserva de viaje - Pedido #${order.display_id || orderId}`
          : `Nueva reserva de tour - Pedido #${order.display_id || orderId}`
        const customerRes = await resend.emails.send({
          from: fromEmail,
          to: [customerEmail],
          subject: customerSubject,
          react: TravelBookingNotificationEmail({
            reservationType: customerReservationType,
            orderId: String(order.display_id || orderId),
            bookingId: bookingReference,
            recipientName: customerName,
            destination:
              typeof customerCartItems[0]?.name === "string" ? customerCartItems[0].name : null,
            imageUrl:
              typeof customerCartItems[0]?.imageUrl === "string"
                ? customerCartItems[0].imageUrl
                : null,
            travelDate: customerCartItems[0]?.date,
            price: typeof customerCartItems[0]?.total === "number" ? customerCartItems[0].total : null,
            currencyCode: typeof order.currency_code === "string" ? order.currency_code : null,
            cartItems: customerCartItems,
            passengers: customerPassengers,
          }),
          tags: [
            { name: "category", value: "tour_booking" },
            { name: "audience", value: "customer" },
            { name: "order_id", value: String(orderId) },
          ],
          headers: {
            "Idempotency-Key": `tour-booking-customer-${orderId}`,
          },
        })

        if (customerRes?.error) {
          logger.error(`Failed to send customer order email for ${orderId}:`, customerRes.error)
        } else {
          logger.info(`Customer order email sent for order ${orderId}`)
        }
      } catch (customerSendError) {
        logger.error(
          `Unexpected error sending customer order email for order ${orderId}:`,
          customerSendError
        )
      }
    }

    for (const booking of createdBookings) {
      try {
        const lineItemsSource = booking.line_items
        const lineItems = Array.isArray(lineItemsSource)
          ? lineItemsSource
          : Array.isArray(lineItemsSource?.items)
            ? lineItemsSource.items
            : lineItemsSource
              ? [lineItemsSource]
              : []
        const lineItem = lineItems[0]

        const passengers = Array.isArray(lineItem?.passengers)
          ? lineItem.passengers
          : []
        const linkedOrderItem = (order.items || []).find(
          (item: any) => item.id === lineItem?.item_id
        )
        const quantityRaw = Number(lineItem?.quantity ?? linkedOrderItem?.quantity)
        const quantity = Number.isFinite(quantityRaw)
          ? Math.max(0, quantityRaw)
          : 0

        const normalizedPrice = (
          [
            lineItem?.total,
            linkedOrderItem?.total,
            linkedOrderItem?.subtotal,
            linkedOrderItem?.unit_price,
          ]
            .map((value) => Number(value))
            .find((value) => Number.isFinite(value)) ?? null
        )
        const destinationRaw =
          linkedOrderItem?.metadata?.tour_destination ??
          linkedOrderItem?.metadata?.package_destination ??
          lineItem?.title ??
          linkedOrderItem?.title
        const destination = typeof destinationRaw === "string" ? destinationRaw : null
        const imageUrlRaw = lineItem?.thumbnail ?? linkedOrderItem?.thumbnail
        const imageUrl = typeof imageUrlRaw === "string" ? imageUrlRaw : null
        const groupIdRaw =
          typeof booking?.metadata?.group_id === "string"
            ? booking.metadata.group_id
            : linkedOrderItem?.metadata?.group_id
        const groupId = typeof groupIdRaw === "string" ? groupIdRaw : null
        const cartDateRaw =
          linkedOrderItem?.metadata?.tour_date ??
          linkedOrderItem?.metadata?.package_date ??
          booking.tour_date
        const cartDate =
          typeof cartDateRaw === "string" || cartDateRaw instanceof Date
            ? cartDateRaw
            : booking.tour_date
        const currencyCode =
          typeof order.currency_code === "string" ? order.currency_code : null

        const subject = `Nueva reserva de tour - Pedido #${order.display_id || orderId}`

        if (resend) {
          if (notificationRecipients.length > 0) {
            try {
              const opsRes = await resend.emails.send({
                from: fromEmail,
                to: notificationRecipients,
                subject,
                react: TravelBookingNotificationEmail({
                  reservationType: "Tour",
                  orderId: String(order.display_id || orderId),
                  bookingId: String(booking.id || "N/A"),
                  recipientName: "Equipo de Operaciones",
                  destination,
                  imageUrl,
                  travelDate: booking.tour_date,
                  price: normalizedPrice,
                  currencyCode,
                  cartItems: [
                    {
                      groupId,
                      name: destination,
                      date: cartDate,
                      quantity,
                      total: normalizedPrice,
                      imageUrl,
                    },
                  ],
                  passengers,
                }),
                tags: [
                  { name: "category", value: "tour_booking" },
                  { name: "audience", value: "ops" },
                  { name: "order_id", value: String(orderId) },
                ],
                headers: {
                  "Idempotency-Key": `tour-booking-ops-${booking.id || orderId}`,
                },
              })

              if (opsRes?.error) {
                logger.error(`Failed to send ops email for booking ${booking.id}:`, opsRes.error)
              } else {
                logger.info(`Ops email sent for booking ${booking.id}`)
              }
            } catch (opsSendError) {
              logger.error(
                `Unexpected error sending ops email for booking ${booking.id}:`,
                opsSendError
              )
            }
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
