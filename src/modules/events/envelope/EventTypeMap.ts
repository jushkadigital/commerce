export interface TourPublishedPayload {
  id: string
  productId: string
  slug: string
  destination: string
  description: string | null
  durationDays: number
  maxCapacity: number
  thumbnail: string | null
  price: number
  isSpecial: boolean
  blockedDates: unknown[]
  blockedWeekDays: unknown[]
  cancellationDeadlineHours: number
  bookingMinDaysAhead: number
  metadata: Record<string, unknown> | null
}

export interface TourUpdatedPayload {
  id: string
  productId: string
  slug: string
  destination: string
  description: string | null
  durationDays: number
  maxCapacity: number
  thumbnail: string | null
  price: number
  isSpecial: boolean
  blockedDates: unknown[]
  blockedWeekDays: unknown[]
  cancellationDeadlineHours: number
  bookingMinDaysAhead: number
  metadata: Record<string, unknown> | null
}

export interface TourDeletedPayload {
  id: string
  productId: string
}

export interface ProductVariantPrice {
  id: string
  amount: number
  currency_code: string
}

export interface ProductVariantPayload {
  id: string
  title: string
  sku: string | null
  prices: ProductVariantPrice[]
}

export interface ProductSyncedPayload {
  id: string
  title: string
  description: string | null
  handle: string
  thumbnail: string | null
  variants: ProductVariantPayload[]
  images: string[]
  tags: string[]
  categories: string[]
  metadata: Record<string, unknown> | null
}

export interface BookingConfirmedPayload {
  id: string
  orderId: string
  entityId: string
  entityType: "tour" | "package"
  tourDate?: string
  packageDate?: string
  lineItems: unknown[] | null
  status: "pending" | "confirmed" | "cancelled" | "completed"
  metadata: Record<string, unknown> | null
}

export interface OrderPlacedPayload {
  id: string
  status: string
  email: string
  displayId: number
  currencyCode: string
  total: number
  items: unknown[]
  metadata: Record<string, unknown> | null
}

export interface PackageCreatedPayload {
  id: string
  productId: string
  slug: string
  destination: string
  description: string | null
  durationDays: number
  maxCapacity: number
  thumbnail: string | null
  price: number
  isSpecial: boolean
  blockedDates: unknown[]
  blockedWeekDays: unknown[]
  cancellationDeadlineHours: number
  bookingMinDaysAhead: number
  metadata: Record<string, unknown> | null
}

export interface PackageUpdatedPayload {
  id: string
  productId: string
  slug: string
  destination: string
  description: string | null
  durationDays: number
  maxCapacity: number
  thumbnail: string | null
  price: number
  isSpecial: boolean
  blockedDates: unknown[]
  blockedWeekDays: unknown[]
  cancellationDeadlineHours: number
  bookingMinDaysAhead: number
  metadata: Record<string, unknown> | null
}

export interface PackageDeletedPayload {
  id: string
  productId: string
}

export interface PaymentReceivedPayload {
  transactionId: string
  orderId: string
  amount: number
  currencyCode: string
  status: string
  paymentMethod: string
  processedAt: string
  metadata: Record<string, unknown> | null
}

export interface EventTypeMap {
  "tour.published": TourPublishedPayload
  "tour.updated": TourUpdatedPayload
  "tour.deleted": TourDeletedPayload
  "product.synced": ProductSyncedPayload
  "booking.confirmed": BookingConfirmedPayload
  "order.placed": OrderPlacedPayload
  "package.created": PackageCreatedPayload
  "package.updated": PackageUpdatedPayload
  "package.deleted": PackageDeletedPayload
  "payment.received": PaymentReceivedPayload
}

export type EventName = keyof EventTypeMap
