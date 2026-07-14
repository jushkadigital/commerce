import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PACKAGE_MODULE } from "../modules/package"
import type PackageModuleService from "../modules/package/service"
import { findExistingPackageBooking } from "../utils/package-booking-idempotency"
import { getBookingStatusFromPaymentStatus } from "../utils/booking-payment-status"
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

export default async function handlePackageOrderPlaced({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id

  try {
    const existingBookings = await findExistingPackageBooking(orderId, container)
    if (existingBookings.length > 0) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "metadata",
        "payment_status",
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
      return
    }

    const packageItems = (order.items || []).filter(
      (item: any) => item.metadata?.is_package === true
    )
    const hasTourItemsInOrder = (order.items || []).some(
      (item: any) => item.metadata?.is_tour === true
    )

    if (packageItems.length === 0) {
      return
    }

    const packageModuleService = container.resolve(
      PACKAGE_MODULE
    ) as PackageModuleService

    const orderPreDataRaw =
      order?.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, any>).preData
        : undefined
    const orderPreData = orderPreDataRaw == null ? undefined : orderPreDataRaw
    const orderPaymentStatus =
      (order as { payment_status?: unknown }).payment_status
    const bookingStatus = getBookingStatusFromPaymentStatus(orderPaymentStatus)

    const bookingsToCreate = packageItems.map((item: any) => {
      const bookingMetadata: Record<string, any> = {}

      if (typeof item.metadata?.group_id === "string") {
        bookingMetadata.group_id = item.metadata.group_id
      }

      if (orderPreData !== undefined) {
        bookingMetadata.preData = structuredClone(orderPreData)
      }

      return {
        order_id: orderId,
        package_id: item.metadata.package_id,
        package_date: new Date(item.metadata.package_date),
        status: bookingStatus,
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
      await packageModuleService.createPackageBookings(bookingsToCreate)
    const createdBookings = Array.isArray(createdBookingsRaw)
      ? createdBookingsRaw
      : [createdBookingsRaw]

    const notificationRecipients = await getOrderNotificationEmails(container)

    if (notificationRecipients.length === 0) {
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
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "bookings@yourdomain.com"

    const customerCartItems = packageItems.map((item: any) => {
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
        date: item.metadata?.package_date ?? null,
        quantity,
        total: rawTotal ?? 0,
        imageUrl: typeof item.thumbnail === "string" ? item.thumbnail : null,
        passengers: item.metadata?.passengers ?? null,
      }
    })

    const customerPassengers = packageItems.flatMap((item: any) =>
      Array.isArray(item.metadata?.passengers) ? item.metadata.passengers : []
    )
    const bookingReference =
      createdBookings
        .map((booking: any) => String(booking?.id || ""))
        .filter((bookingId: string) => bookingId.length > 0)
        .join(", ") || "N/A"

    if (resend && customerEmail && !hasTourItemsInOrder) {
      try {
        const customerSubject = "Nueva reserva de paquete"
        const TravelBookingNotificationEmail =
          await getTravelBookingNotificationEmail()
        const customerResult = await resend.emails.send({
          from: fromEmail,
          to: [customerEmail],
          subject: customerSubject,
          react: TravelBookingNotificationEmail({
            reservationType: "Package",
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
            { name: "category", value: "package_booking" },
            { name: "audience", value: "customer" },
            { name: "order_id", value: String(orderId) },
          ],
          headers: {
            "Idempotency-Key": `package-booking-customer-${orderId}`,
          },
        })

        if (customerResult?.error) {
        } else {
        }
      } catch (customerSendError) {
      }
    }

    if (resend && !hasTourItemsInOrder && notificationRecipients.length > 0) {
      try {
        const opsSubject = "Nueva reserva de paquete"

        const AdminBookingNotificationEmail = await getAdminBookingNotificationEmail()
        const opsRes = await resend.emails.send({
          from: fromEmail,
          to: notificationRecipients,
          subject: opsSubject,
          react: AdminBookingNotificationEmail({
            reservationType: "Package",
            orderId: String(orderId),
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
            { name: "category", value: "package_booking" },
            { name: "audience", value: "ops" },
            { name: "order_id", value: String(orderId) },
          ],
          headers: {
            "Idempotency-Key": `package-booking-ops-${orderId}`,
          },
        })

        if (opsRes?.error) {
        } else {
        }
      } catch (opsSendError) {
      }
    } else if (!resend) {
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