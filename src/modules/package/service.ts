import { MedusaService, Modules } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import Package from "./models/package"
import PackageVariant, { PassengerType } from "./models/package-variant"
import PackageBooking from "./models/package-booking"
import PackageServiceVariant from "./models/package-service-variant"

export interface PackagePricing {
  packageId: string
  destination: string
  prices: {
    adult: { price: number; currency: string }
    child: { price: number; currency: string }
    infant: { price: number; currency: string }
  }
}

export interface CartItem {
  package_id: string
  package_date: string
  adults: number
  children: number
  infants: number
  passengers: Array<{
    type: PassengerType
    name: string
    email?: string
    phone?: string
  }>
}

export interface CartTotal {
  subtotal: number
  currency: string
  items: Array<{
    package_id: string
    destination: string
    package_date: string
    adults: { quantity: number; unit_price: number; total: number }
    children: { quantity: number; unit_price: number; total: number }
    infants: { quantity: number; unit_price: number; total: number }
  }>
}

class PackageModuleService extends MedusaService({
  Package,
  PackageVariant,
  PackageBooking,
  PackageServiceVariant,
}) {
  // --- Entity cache (10s TTL) ---
  // Packages change rarely (admin edits). Caching retrievePackage avoids a
  // ~150ms DB query on every booking request. 10s TTL bounds staleness.
  private packageCache_ = new Map<string, { value: any; expires: number }>()
  private static readonly PACKAGE_CACHE_TTL_MS = 10_000

  /**
   * Cached wrapper around retrievePackage. Returns a clone so callers can't
   * mutate the cached entry. Cache key includes relations to avoid collisions.
   */
  async retrievePackageCached(id: string, config?: { relations?: string[] }): Promise<any> {
    const relationsKey = config?.relations ? JSON.stringify(config.relations) : "none"
    const key = `${id}:${relationsKey}`
    const now = Date.now()
    const hit = this.packageCache_.get(key)
    if (hit && hit.expires > now) {
      return JSON.parse(JSON.stringify(hit.value))
    }
    const value = await this.retrievePackage(id, config)
    this.packageCache_.set(key, { value, expires: now + PackageModuleService.PACKAGE_CACHE_TTL_MS })
    if (this.packageCache_.size > 100) {
      for (const [k, v] of this.packageCache_) {
        if (v.expires <= now) this.packageCache_.delete(k)
      }
    }
    return value
  }

  /** Invalidate cached package entries (call on admin package updates if needed). */
  invalidatePackageCache(id?: string): void {
    if (id) {
      for (const k of this.packageCache_.keys()) {
        if (k.startsWith(`${id}:`)) this.packageCache_.delete(k)
      }
    } else {
      this.packageCache_.clear()
    }
  }
  async getAvailableCapacity(
    packageId: string,
    packageDate: Date,
    pkg?: InferTypeOf<typeof Package>
  ): Promise<number> {
    const packageEntity = pkg ?? await this.retrievePackage(packageId)

    // Normalize date to start and end of day for proper date-only matching
    const startOfDay = new Date(packageDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(packageDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // Fetch only reserved_passengers (not full line_items JSON).
    // reserved_passengers is computed at booking creation time = adults + children
    // (infants excluded from capacity). Much faster than hydrating + parsing JSON.
    // package_date kept in select for the JS fallback filter below.
    let bookings = await this.listPackageBookings(
      {
        package_id: packageId,
        package_date: {
          $gte: startOfDay.toISOString(),
          $lte: endOfDay.toISOString(),
        },
        status: ["confirmed", "pending"],
      },
      { select: ["id", "reserved_passengers", "package_date"] }
    ) as any[]

    // Fallback: ensure exact date matching in case MikroORM date queries are unreliable
    bookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.package_date)
      return bookingDate >= startOfDay && bookingDate <= endOfDay
    })

    const reservedPassengers = bookings.reduce(
      (sum, b) => sum + (Number(b.reserved_passengers) || 0),
      0
    )

    return packageEntity.max_capacity - reservedPassengers
  }
  async getPackageByMetadata(value: string) {
    const newFormat = await this.listPackages({
      metadata: { payloadId: String(value) }
    }, { take: 1 })
    if (newFormat.length) return newFormat

    const bareId = value.replace(/package$/, "")
    if (bareId !== value) {
      const legacy = await this.listPackages({
        metadata: { payloadId: bareId }
      }, { take: 1 })
      if (legacy.length) return legacy
    }

    return []
  }

  async validateBooking(
    packageId: string,
    packageDate: Date,
    quantity: number,
    pkg?: InferTypeOf<typeof Package>
  ): Promise<{ valid: boolean; reason?: string }> {
    const packageEntity = pkg ?? await this.retrievePackage(packageId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const requestedDateObj = new Date(packageDate)
    requestedDateObj.setHours(0, 0, 0, 0)

    if (requestedDateObj < today) {
      return {
        valid: false,
        reason: "No puedes reservar para fechas pasadas",
      }
    }

    const minBookingDate = new Date(today)
    minBookingDate.setDate(minBookingDate.getDate() + (packageEntity.booking_min_days_ahead || 0))
    if (requestedDateObj < minBookingDate) {
      return {
        valid: false,
        reason: `Se deben hacer reservas al menos ${packageEntity.booking_min_days_ahead} dias en adelante`,
      }
    }

    // Validate blocked_dates
    const requestedDateStr = requestedDateObj.toISOString().split('T')[0]
    const blockedDates = packageEntity.blocked_dates || []
    if (blockedDates.includes(requestedDateStr)) {
      return {
        valid: false,
        reason: "Esta fecha no esta disponible para reservar",
      }
    }

    // Validate blocked_week_days
    const dayOfWeek = requestedDateObj.getDay()
    const blockedWeekDays = packageEntity.blocked_week_days || []
    if (blockedWeekDays.map(Number).includes(dayOfWeek)) {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      return {
        valid: false,
        reason: `Paquetes no estan disponibles los ${days[dayOfWeek]}`,
      }
    }

    const availableCapacity = await this.getAvailableCapacity(packageId, packageDate, packageEntity)

    if (availableCapacity < quantity) {
      return {
        valid: false,
        reason: `Solo ${availableCapacity} espacios disponibles`,
      }
    }

    return { valid: true }
  }

  async getPackagePricing(packageId: string, options?: { currencyCode?: string; container?: any }): Promise<PackagePricing> {
    const currencyCode = options?.currencyCode || "PEN"
    const pkg = await this.retrievePackage(packageId, {
      relations: ["variants"],
    })

    const prices = {
      adult: { price: 0, currency: currencyCode },
      child: { price: 0, currency: currencyCode },
      infant: { price: 0, currency: currencyCode },
    }

    if (!options?.container) {
      return {
        packageId: pkg.id,
        destination: pkg.destination,
        prices,
      }
    }

    const pricingModule = options.container.resolve(Modules.PRICING)

    const variantIds = (pkg.variants || [])
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      return {
        packageId: pkg.id,
        destination: pkg.destination,
        prices,
      }
    }

    try {
      const calculatedPrices = await pricingModule.calculatePrices(
        { id: variantIds },
        {
          context: {
            currency_code: currencyCode,
          },
        }
      )

      for (const variant of pkg.variants || []) {
        const calculatedPrice = calculatedPrices.find(
          (cp: any) => cp.id === variant.variant_id
        )

        if (calculatedPrice) {
          const priceValue = calculatedPrice.calculated_amount
            ? Number(calculatedPrice.calculated_amount)
            : 0

          switch (variant.passenger_type) {
            case PassengerType.ADULT:
              prices.adult = { price: priceValue, currency: currencyCode }
              break
            case PassengerType.CHILD:
              prices.child = { price: priceValue, currency: currencyCode }
              break
            case PassengerType.INFANT:
              prices.infant = { price: priceValue, currency: currencyCode }
              break
          }
        }
      }
    } catch (error) {
      console.error("Error fetching prices from Pricing Module:", error)
    }

    return {
      packageId: pkg.id,
      destination: pkg.destination,
      prices,
    }
  }

  async calculateCartTotal(items: CartItem[], container?: any): Promise<CartTotal> {
    let subtotal = 0
    let currency = "PEN"
    const itemDetails: CartTotal["items"] = []

    for (const item of items) {
      const pricing = await this.getPackagePricing(item.package_id, { container })
      const pkg = await this.retrievePackage(item.package_id)

      const adultTotal = item.adults * pricing.prices.adult.price
      const childTotal = item.children * pricing.prices.child.price
      const infantTotal = item.infants * pricing.prices.infant.price

      currency = pricing.prices.adult.currency

      itemDetails.push({
        package_id: item.package_id,
        destination: pkg.destination,
        package_date: item.package_date,
        adults: {
          quantity: item.adults,
          unit_price: pricing.prices.adult.price,
          total: adultTotal,
        },
        children: {
          quantity: item.children,
          unit_price: pricing.prices.child.price,
          total: childTotal,
        },
        infants: {
          quantity: item.infants,
          unit_price: pricing.prices.infant.price,
          total: infantTotal,
        },
      })

      subtotal += adultTotal + childTotal + infantTotal
    }

    return {
      subtotal,
      currency,
      items: itemDetails,
    }
  }

  async updateVariantPrices(
    packageId: string,
    prices: {
      adult?: number
      child?: number
      infant?: number
      currency_code?: string
    },
    container?: any
  ): Promise<void> {
    const pkg = await this.retrievePackage(packageId, {
      relations: ["variants"],
    })

    const currency = prices.currency_code || "PEN"
    const existingVariants = pkg.variants || []

    if (!container) {
      return
    }

    const { ContainerRegistrationKeys } = await import("@medusajs/framework/utils")
    const pricingModule = container.resolve(Modules.PRICING)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const variantIds = existingVariants
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      return
    }

    const { data: variantsWithPriceSets } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id"],
      filters: {
        id: variantIds,
      },
    })

    const variantToPriceSetMap = new Map<string, string>()
    for (const variantData of variantsWithPriceSets || []) {
      if (variantData.price_set?.id) {
        variantToPriceSetMap.set(variantData.id, variantData.price_set.id)
      }
    }

    for (const passengerType of Object.values(PassengerType)) {
      const existingVariant = existingVariants.find(
        (v: any) => v.passenger_type === passengerType
      )

      if (!existingVariant || !existingVariant.variant_id) continue

      const priceSetId = variantToPriceSetMap.get(existingVariant.variant_id)
      if (!priceSetId) {
        continue
      }

      let priceAmount = 0
      switch (passengerType) {
        case PassengerType.ADULT:
          priceAmount = prices.adult || 0
          break
        case PassengerType.CHILD:
          priceAmount = prices.child || 0
          break
        case PassengerType.INFANT:
          priceAmount = prices.infant || 0
          break
      }

      try {
        await pricingModule.updatePriceSets(priceSetId, {
          prices: [
            {
              amount: priceAmount,
              currency_code: currency.toLowerCase(),
            },
          ],
        })
      } catch (error) {
        console.error(
          `Error updating price for variant ${existingVariant.variant_id}:`,
          error
        )
      }
    }
  }
}

export default PackageModuleService
