export {
  EventRegistry,
  eventRegistry,
  type EventDescriptor,
  type ValidationResult,
} from "./EventRegistry"

// Importing catalog triggers side-effect registration
import "./catalog"

// Schema re-exports
export {
  TourPublishedV1Schema,
  TourUpdatedV1Schema,
  TourDeletedV1Schema,
} from "./schemas/tour-schemas"

export {
  ProductSyncedV1Schema,
  ProductUpdatedV1Schema,
} from "./schemas/product-schemas"

export {
  BookingConfirmedV1Schema,
  BookingCancelledV1Schema,
} from "./schemas/booking-schemas"

export {
  OrderPlacedV1Schema,
  OrderUpdatedV1Schema,
} from "./schemas/order-schemas"

export {
  PackagePublishedV1Schema,
  PackageUpdatedV1Schema,
  PackageDeletedV1Schema,
} from "./schemas/package-schemas"

export { PaymentReceivedV1Schema } from "./schemas/payment-schemas"

export {
  InboundTourCreatedV1Schema,
  InboundTourUpdatedV1Schema,
  InboundTourDeletedV1Schema,
  InboundPackageCreatedV1Schema,
  InboundPackageUpdatedV1Schema,
  InboundPackageDeletedV1Schema,
  InboundPaymentReceivedV1Schema,
} from "./schemas/inbound-schemas"
