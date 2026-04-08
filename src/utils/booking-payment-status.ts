const SUCCESSFUL_PAYMENT_STATUSES = new Set([
  "authorized",
  "captured",
  "partially_authorized",
  "partially_captured",
  "paid",
])

export function shouldConfirmBookingsFromPaymentStatus(status: unknown): boolean {
  return typeof status === "string" && SUCCESSFUL_PAYMENT_STATUSES.has(status)
}

export function getBookingStatusFromPaymentStatus(
  status: unknown
): "pending" | "confirmed" {
  return shouldConfirmBookingsFromPaymentStatus(status) ? "confirmed" : "pending"
}
