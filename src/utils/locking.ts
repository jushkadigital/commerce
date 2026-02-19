export function generateTourLockKey(tourId: string, date: string): string {
  return `tour:${tourId}:${date}`
}

export function generateCartLockKey(cartId: string): string {
  return `cart:${cartId}`
}

export function generatePackageLockKey(packageId: string, date: string): string {
  return `package:${packageId}:${date}`
}
