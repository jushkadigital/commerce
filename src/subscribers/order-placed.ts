import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import { findExistingBooking } from "../utils/booking-idempotency"
import { resend } from "../utils/email"
import { getOrderNotificationEmails } from "../utils/order-notification-emails"

type TravelBookingNotificationEmailFn =
  typeof import("../emails/travel-booking-notification.js").TravelBookingNotificationEmail

type AdminBookingNotificationEmailFn =
  typeof import("../emails/admin-booking-notification.js").AdminBookingNotificationEmail

let travelBookingNotificationEmail:
  | TravelBookingNotificationEmailFn
  | null = null

let adminBookingNotificationEmail:
  | AdminBookingNotificationEmailFn
  | null = null

const isTestRuntime = process.env.NODE_ENV === "test" || !!process.env.TEST_TYPE

async function getTravelBookingNotificationEmail(): Promise<TravelBookingNotificationEmailFn> {
  if (travelBookingNotificationEmail) {
    return travelBookingNotificationEmail
  }

  if (isTestRuntime) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require("../emails/travel-booking-notification.tsx") as {
      TravelBookingNotificationEmail: TravelBookingNotificationEmailFn
    }
    travelBookingNotificationEmail = module.TravelBookingNotificationEmail
    return module.TravelBookingNotificationEmail
  }

  const module = await import("../emails/travel-booking-notification.js")
  travelBookingNotificationEmail = module.TravelBookingNotificationEmail
  return module.TravelBookingNotificationEmail
}

async function getAdminBookingNotificationEmail(): Promise<AdminBookingNotificationEmailFn> {
  if (adminBookingNotificationEmail) {
    return adminBookingNotificationEmail
  }

  if (isTestRuntime) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require("../emails/admin-booking-notification.tsx") as {
      AdminBookingNotificationEmail: AdminBookingNotificationEmailFn
    }
    adminBookingNotificationEmail = module.AdminBookingNotificationEmail
    return module.AdminBookingNotificationEmail
  }

  const module = await import("../emails/admin-booking-notification.js")
  adminBookingNotificationEmail = module.AdminBookingNotificationEmail
  return module.AdminBookingNotificationEmail
}

export default async function handleOrderPlaced({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderId = event.data.id

  try {
    const existingBookings = await findExistingBooking(orderId, container)
    const hasExistingBookings = existingBookings.length > 0

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

    let createdBookings: any[] = existingBookings

    if (hasExistingBookings) {
      logger.info(
        `[order.placed] Bookings already exist for order ${orderId}, skipping booking creation (idempotent) and continuing with notifications.`
      )
    } else {
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
      createdBookings = Array.isArray(createdBookingsRaw)
        ? createdBookingsRaw
        : [createdBookingsRaw]

      logger.info(
        `[order.placed] Created ${createdBookings.length} tour booking(s) for order ${orderId}: ${createdBookings.map((b: any) => b.id).join(", ")}`
      )
    }

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
        metadata: {
          group_id: typeof item.metadata?.group_id === "string" ? item.metadata.group_id : null,
          passengers: item.metadata?.passengers ?? null,
        },
        name: destination,
        date: item.metadata?.tour_date ?? item.metadata?.package_date ?? null,
        quantity,
        total: rawTotal ?? 0,
        imageUrl: typeof item.thumbnail === "string" ? item.thumbnail : null,
        passengers: item.metadata?.passengers ?? null,
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
          ? "Nueva reserva de viaje"
          : "Nueva reserva de tour"
        const TravelBookingNotificationEmail =
          await getTravelBookingNotificationEmail()
        const customerRes = await resend.emails.send({
          from: fromEmail,
          to: [customerEmail],
          subject: customerSubject,
          react: TravelBookingNotificationEmail({
            reservationType: customerReservationType,
            orderId: String(orderId),
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

    if (resend && notificationRecipients.length > 0) {
      try {
        const opsSubject = hasPackageItemsForCustomer
          ? "Nueva reserva de viaje"
          : "Nueva reserva de tour"
        
        const AdminBookingNotificationEmail = await getAdminBookingNotificationEmail()
        const opsRes = await resend.emails.send({
          from: fromEmail,
          to: notificationRecipients,
          subject: opsSubject,
          react: AdminBookingNotificationEmail({
            reservationType: customerReservationType,
            orderId: String(order.display_id || orderId),
            bookingId: bookingReference,
            customerName: customerName,
            customerEmail: customerEmail,
            destination: typeof customerCartItems[0]?.name === "string" ? customerCartItems[0].name : null,
            imageUrl: typeof customerCartItems[0]?.imageUrl === "string" ? customerCartItems[0].imageUrl : null,
            travelDate: customerCartItems[0]?.date,
            price: typeof customerCartItems[0]?.total === "number" ? customerCartItems[0].total : null,
            currencyCode: typeof order.currency_code === "string" ? order.currency_code : null,
            cartItems: customerCartItems,
            passengers: customerPassengers,
          }),
          tags: [
            { name: "category", value: "tour_booking" },
            { name: "audience", value: "ops" },
            { name: "order_id", value: String(orderId) },
          ],
          headers: {
            "Idempotency-Key": `tour-booking-ops-${orderId}`,
          },
        })

        if (opsRes?.error) {
          logger.error(`Failed to send ops email for order ${orderId}:`, opsRes.error)
        } else {
          logger.info(`Ops email sent for order ${orderId}`)
        }
      } catch (opsSendError) {
        logger.error(`Unexpected error sending ops email for order ${orderId}:`, opsSendError)
      }
    } else if (!resend) {
      logger.warn(`Resend client not initialized, skipping ops email for order ${orderId}`)
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
