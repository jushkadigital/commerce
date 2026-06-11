import { eventRegistry } from "./EventRegistry"
import {
  TourPublishedV1Schema,
  TourUpdatedV1Schema,
  TourDeletedV1Schema,
} from "./schemas/tour-schemas"
import {
  ProductSyncedV1Schema,
  ProductUpdatedV1Schema,
} from "./schemas/product-schemas"
import {
  BookingConfirmedV1Schema,
  BookingCancelledV1Schema,
} from "./schemas/booking-schemas"
import {
  OrderPlacedV1Schema,
  OrderUpdatedV1Schema,
} from "./schemas/order-schemas"
import {
  PackagePublishedV1Schema,
  PackageUpdatedV1Schema,
  PackageDeletedV1Schema,
} from "./schemas/package-schemas"
import { PaymentReceivedV1Schema } from "./schemas/payment-schemas"
import {
  InboundTourCreatedV1Schema,
  InboundTourUpdatedV1Schema,
  InboundTourDeletedV1Schema,
  InboundPackageCreatedV1Schema,
  InboundPackageUpdatedV1Schema,
  InboundPackageDeletedV1Schema,
  InboundPaymentReceivedV1Schema,
} from "./schemas/inbound-schemas"
import { IdentityUserCreatedV1Schema, IdentityUserDeletedV1Schema } from "./schemas/identity-schemas"

// Exchange constants aligned with topology declarations
const INTEGRATION_EXCHANGE = "tourism.integration"
const NOTIFICATION_EXCHANGE = "tourism.notification"
const INBOUND_EXCHANGE = "tourism.inbound"
const IDENTITY_EXCHANGE = "identity.events"

// ─── Integration events (outbound to external systems) ───

eventRegistry.register({
  eventType: "integration.tour.published.v1",
  category: "integration",
  aggregateType: "tour",
  action: "published",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.tour.published.v1",
  schema: TourPublishedV1Schema,
  description: "Tour published/created — synced from external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "integration.tour.updated.v1",
  category: "integration",
  aggregateType: "tour",
  action: "updated",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.tour.updated.v1",
  schema: TourUpdatedV1Schema,
  description: "Tour updated in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "integration.tour.deleted.v1",
  category: "integration",
  aggregateType: "tour",
  action: "deleted",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.tour.deleted.v1",
  schema: TourDeletedV1Schema,
  description: "Tour deleted in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "integration.product.synced.v1",
  category: "integration",
  aggregateType: "product",
  action: "synced",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.product.synced.v1",
  schema: ProductSyncedV1Schema,
  description: "Product synced with full variants, prices and images",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "integration.product.updated.v1",
  category: "integration",
  aggregateType: "product",
  action: "updated",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.product.updated.v1",
  schema: ProductUpdatedV1Schema,
  description: "Product updated with partial payload",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "integration.booking.confirmed.v1",
  category: "integration",
  aggregateType: "booking",
  action: "confirmed",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.booking.confirmed.v1",
  schema: BookingConfirmedV1Schema,
  description: "Booking confirmed after order placement",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "integration.booking.cancelled.v1",
  category: "integration",
  aggregateType: "booking",
  action: "cancelled",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.booking.cancelled.v1",
  schema: BookingCancelledV1Schema,
  description: "Booking cancelled by customer or admin",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "integration.order.placed.v1",
  category: "integration",
  aggregateType: "order",
  action: "placed",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.order.placed.v1",
  schema: OrderPlacedV1Schema,
  description: "Order placed by customer",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "integration.order.updated.v1",
  category: "integration",
  aggregateType: "order",
  action: "updated",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.order.updated.v1",
  schema: OrderUpdatedV1Schema,
  description: "Order updated (status, payment, etc.)",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "integration.package.published.v1",
  category: "integration",
  aggregateType: "package",
  action: "published",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.package.published.v1",
  schema: PackagePublishedV1Schema,
  description: "Travel package published — synced from external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "integration.package.updated.v1",
  category: "integration",
  aggregateType: "package",
  action: "updated",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.package.updated.v1",
  schema: PackageUpdatedV1Schema,
  description: "Travel package updated in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "integration.package.deleted.v1",
  category: "integration",
  aggregateType: "package",
  action: "deleted",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.package.deleted.v1",
  schema: PackageDeletedV1Schema,
  description: "Travel package deleted in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "integration.payment.received.v1",
  category: "integration",
  aggregateType: "payment",
  action: "received",
  version: 1,
  exchange: INTEGRATION_EXCHANGE,
  routingKey: "integration.payment.received.v1",
  schema: PaymentReceivedV1Schema,
  description: "Payment received for an order",
  producer: "medusa-backend",
})

// ─── Notification events (email / webhook) ───

eventRegistry.register({
  eventType: "notification.booking.confirmation.v1",
  category: "notification",
  aggregateType: "booking",
  action: "confirmation",
  version: 1,
  exchange: NOTIFICATION_EXCHANGE,
  routingKey: "notification.booking.confirmation.v1",
  schema: BookingConfirmedV1Schema,
  description: "Booking confirmation email notification",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "notification.booking.cancelled.v1",
  category: "notification",
  aggregateType: "booking",
  action: "cancelled",
  version: 1,
  exchange: NOTIFICATION_EXCHANGE,
  routingKey: "notification.booking.cancelled.v1",
  schema: BookingCancelledV1Schema,
  description: "Booking cancellation email notification",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "notification.order.confirmation.v1",
  category: "notification",
  aggregateType: "order",
  action: "confirmation",
  version: 1,
  exchange: NOTIFICATION_EXCHANGE,
  routingKey: "notification.order.confirmation.v1",
  schema: OrderPlacedV1Schema,
  description: "Order confirmation email notification",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "notification.payment.receipt.v1",
  category: "notification",
  aggregateType: "payment",
  action: "receipt",
  version: 1,
  exchange: NOTIFICATION_EXCHANGE,
  routingKey: "notification.payment.receipt.v1",
  schema: PaymentReceivedV1Schema,
  description: "Payment receipt email notification",
  producer: "medusa-backend",
})

eventRegistry.register({
  eventType: "notification.tour.update.v1",
  category: "notification",
  aggregateType: "tour",
  action: "update",
  version: 1,
  exchange: NOTIFICATION_EXCHANGE,
  routingKey: "notification.tour.update.v1",
  schema: TourUpdatedV1Schema,
  description: "Tour update notification to customers",
  producer: "medusa-backend",
})

// ─── Inbound events (from external systems) ───

eventRegistry.register({
  eventType: "inbound.tour.created.v1",
  category: "inbound",
  aggregateType: "tour",
  action: "created",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.tour.created.v1",
  schema: InboundTourCreatedV1Schema,
  description: "Tour created in external CMS (PayloadCMS / Quarkus)",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "inbound.tour.updated.v1",
  category: "inbound",
  aggregateType: "tour",
  action: "updated",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.tour.updated.v1",
  schema: InboundTourUpdatedV1Schema,
  description: "Tour updated in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "inbound.tour.deleted.v1",
  category: "inbound",
  aggregateType: "tour",
  action: "deleted",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.tour.deleted.v1",
  schema: InboundTourDeletedV1Schema,
  description: "Tour deleted in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "inbound.package.created.v1",
  category: "inbound",
  aggregateType: "package",
  action: "created",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.package.created.v1",
  schema: InboundPackageCreatedV1Schema,
  description: "Package created in external CMS (PayloadCMS / Quarkus)",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "inbound.package.updated.v1",
  category: "inbound",
  aggregateType: "package",
  action: "updated",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.package.updated.v1",
  schema: InboundPackageUpdatedV1Schema,
  description: "Package updated in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "inbound.package.deleted.v1",
  category: "inbound",
  aggregateType: "package",
  action: "deleted",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.package.deleted.v1",
  schema: InboundPackageDeletedV1Schema,
  description: "Package deleted in external CMS",
  producer: "payload-cms",
})

eventRegistry.register({
  eventType: "inbound.payment.received.v1",
  category: "inbound",
  aggregateType: "payment",
  action: "received",
  version: 1,
  exchange: INBOUND_EXCHANGE,
  routingKey: "inbound.payment.received.v1",
  schema: InboundPaymentReceivedV1Schema,
  description: "Payment received event from external payment provider",
  producer: "payment-gateway",
})

// ─── Identity events (user management from Quarkus) ───

eventRegistry.register({
  eventType: "identity.user.created.v1",
  category: "identity",
  aggregateType: "user",
  action: "created",
  version: 1,
  exchange: IDENTITY_EXCHANGE,
  routingKey: "identity.user.created.v1",
  schema: IdentityUserCreatedV1Schema,
  description: "User created in Keycloak via Quarkus identity domain",
  producer: "quarkus-identity",
})

eventRegistry.register({
  eventType: "identity.user.deleted.v1",
  category: "identity",
  aggregateType: "user",
  action: "deleted",
  version: 1,
  exchange: IDENTITY_EXCHANGE,
  routingKey: "identity.user.deleted.v1",
  schema: IdentityUserDeletedV1Schema,
  description: "User deleted in Keycloak via AdminEvent DELETE+USER",
  producer: "quarkus-identity",
})
