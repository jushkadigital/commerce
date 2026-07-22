import { MedusaService, Modules } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import Tour from "./models/tour"
import TourVariant, { PassengerType } from "./models/tour-variant"
import TourBooking from "./models/tour-booking"
import TourServiceVariant from "./models/tour-service-variant"

export interface TourPricing {
  tourId: string
  destination: string
  prices: {
    adult: { price: number; currency: string }
    child: { price: number; currency: string }
    infant: { price: number; currency: string }
  }
}

export interface CartItem {
  tour_id: string
  tour_date: string
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
    tour_id: string
    destination: string
    tour_date: string
    adults: { quantity: number; unit_price: number; total: number }
    children: { quantity: number; unit_price: number; total: number }
    infants: { quantity: number; unit_price: number; total: number }
  }>
}

class TourModuleService extends MedusaService({
  Tour,
  TourVariant,
  TourBooking,
  TourServiceVariant,
}) {
  // --- Entity cache (10s TTL) ---
  // Tours change rarely (admin edits). Caching retrieveTour avoids a ~150ms DB
  // query on every booking request. 10s TTL bounds staleness: worst case a
  // capacity reduction takes 10s to propagate. Acceptable for booking flows.
  private tourCache_ = new Map<string, { value: any; expires: number }>()
  private static readonly TOUR_CACHE_TTL_MS = 10_000

  /**
   * Cached wrapper around retrieveTour. Returns a clone so callers can't
   * mutate the cached entry. Cache key includes relations to avoid collisions
   * between "with variants" and "without variants" fetches.
   */
  async retrieveTourCached(id: string, config?: { relations?: string[] }): Promise<any> {
    const relationsKey = config?.relations ? JSON.stringify(config.relations) : "none"
    const key = `${id}:${relationsKey}`
    const now = Date.now()
    const hit = this.tourCache_.get(key)
    if (hit && hit.expires > now) {
      // Return a clone so callers can't corrupt the cached object
      return JSON.parse(JSON.stringify(hit.value))
    }
    const value = await this.retrieveTour(id, config)
    this.tourCache_.set(key, { value, expires: now + TourModuleService.TOUR_CACHE_TTL_MS })
    // Opportunistic cleanup: drop expired entries to bound memory
    if (this.tourCache_.size > 100) {
      for (const [k, v] of this.tourCache_) {
        if (v.expires <= now) this.tourCache_.delete(k)
      }
    }
    return value
  }

  /** Invalidate cached tour entries (call on admin tour updates if needed). */
  invalidateTourCache(id?: string): void {
    if (id) {
      for (const k of this.tourCache_.keys()) {
        if (k.startsWith(`${id}:`)) this.tourCache_.delete(k)
      }
    } else {
      this.tourCache_.clear()
    }
  }
  async getAvailableCapacity(
    tourId: string,
    tourDate: Date,
    tour?: InferTypeOf<typeof Tour>
  ): Promise<number> {
    const tourEntity = tour ?? await this.retrieveTour(tourId)

    // Fetch only the reserved_passengers column (not the full line_items JSON).
    // reserved_passengers is computed at booking creation time = adults + children
    // (infants excluded from capacity). Much faster than hydrating + parsing JSON.
    const bookings = await this.listTourBookings(
      { tour_id: tourId, tour_date: tourDate, status: ["confirmed", "pending"] },
      { select: ["id", "reserved_passengers"] }
    )

    const reservedPassengers = bookings.reduce(
      (sum, b) => sum + (Number(b.reserved_passengers) || 0),
      0
    )

    return tourEntity.max_capacity - reservedPassengers
  }

  async validateBooking(
    tourId: string,
    tourDate: Date,
    quantity: number,
    tour?: InferTypeOf<typeof Tour>
  ): Promise<{ valid: boolean; reason?: string }> {
    const tourEntity = tour ?? await this.retrieveTour(tourId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const requestedDateObj = new Date(tourDate)
    requestedDateObj.setHours(0, 0, 0, 0)

    if (requestedDateObj < today) {
      return {
        valid: false,
        reason: "No puedes reservar para fechas pasadas",
      }
    }

    const minBookingDate = new Date(today)
    minBookingDate.setDate(minBookingDate.getDate() + (tourEntity.booking_min_days_ahead || 0))
    if (requestedDateObj < minBookingDate) {
      return {
        valid: false,
        reason: `Se deben hacer reservas al menos ${tourEntity.booking_min_days_ahead} dias en adelante`,
      }
    }

    const requestedDateStr = requestedDateObj.toISOString().split('T')[0]
    const blockedDates = tourEntity.blocked_dates || []
    if (blockedDates.includes(requestedDateStr)) {
      return {
        valid: false,
        reason: "Esta fecha no esta disponible para reservar",
      }
    }

    const dayOfWeek = requestedDateObj.getDay()
    const blockedWeekDays = tourEntity.blocked_week_days || []
    if (blockedWeekDays.map(Number).includes(dayOfWeek)) {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      return {
        valid: false,
        reason: `Tours no estan disponibles los ${days[dayOfWeek]}`,
      }
    }

    const availableCapacity = await this.getAvailableCapacity(tourId, tourDate, tourEntity)

    if (availableCapacity < quantity) {
      return {
        valid: false,
        reason: `Solo ${availableCapacity} espacios disponibles`,
      }
    }

    return { valid: true }
  }

  async getTourPricing(tourId: string, options?: { currencyCode?: string; container?: any }): Promise<TourPricing> {
    const currencyCode = options?.currencyCode || "PEN"
    const tour = await this.retrieveTour(tourId, {
      relations: ["variants"],
    })

    const prices = {
      adult: { price: 0, currency: currencyCode },
      child: { price: 0, currency: currencyCode },
      infant: { price: 0, currency: currencyCode },
    }

    // If no container provided, return zeros (backward compatibility)
    if (!options?.container) {
      return {
        tourId: tour.id,
        destination: tour.destination,
        prices,
      }
    }

    // Get prices from Medusa's Pricing Module
    const pricingModule = options.container.resolve(Modules.PRICING)

    // Get variant IDs linked to this tour
    const variantIds = (tour.variants || [])
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      // No variants linked yet, return zeros
      return {
        tourId: tour.id,
        destination: tour.destination,
        prices,
      }
    }

    // Calculate prices using Pricing Module
    try {
      const calculatedPrices = await pricingModule.calculatePrices(
        { id: variantIds },
        {
          context: {
            currency_code: currencyCode,
          },
        }
      )

      // Map calculated prices back to passenger types
      for (const variant of tour.variants || []) {
        const calculatedPrice = calculatedPrices.find(
          (cp: any) => cp.id === variant.variant_id
        )

        if (calculatedPrice) {
          // NOTE: Medusa v2 stores prices in MAJOR UNITS (not cents)
          // So the amount is already the display value
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
      // Return zeros if pricing module fails
    }

    return {
      tourId: tour.id,
      destination: tour.destination,
      prices,
    }
  }

  async calculateCartTotal(items: CartItem[], container?: any): Promise<CartTotal> {
    let subtotal = 0
    let currency = "PEN"
    const itemDetails: CartTotal["items"] = []

    for (const item of items) {
      const pricing = await this.getTourPricing(item.tour_id, { container })
      const tour = await this.retrieveTour(item.tour_id)

      const adultTotal = item.adults * pricing.prices.adult.price
      const childTotal = item.children * pricing.prices.child.price
      const infantTotal = item.infants * pricing.prices.infant.price

      currency = pricing.prices.adult.currency

      itemDetails.push({
        tour_id: item.tour_id,
        destination: tour.destination,
        tour_date: item.tour_date,
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
  async getTourByMetadata(value: string) {
    const newFormat = await this.listTours({
      metadata: { payloadId: String(value) }
    }, { take: 1 })
    if (newFormat.length) return newFormat

    const bareId = value.replace(/tour$/, "")
    if (bareId !== value) {
      const legacy = await this.listTours({
        metadata: { payloadId: bareId }
      }, { take: 1 })
      if (legacy.length) return legacy
    }

    return []
  }

  async updateVariantPrices(
    tourId: string,
    prices: {
      adult?: number
      child?: number
      infant?: number
      currency_code?: string
    },
    container?: any
  ): Promise<void> {
    const tour = await this.retrieveTour(tourId, {
      relations: ["variants"],
    })

    const currency = prices.currency_code || "PEN"
    const existingVariants = tour.variants || []

    // If no container provided, skip pricing update (backward compatibility)
    if (!container) {
      return
    }

    // Update prices using Medusa's Pricing Module
    const { ContainerRegistrationKeys } = await import("@medusajs/framework/utils")
    const pricingModule = container.resolve(Modules.PRICING)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get variant IDs
    const variantIds = existingVariants
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      return
    }

    // Query variants with their price sets using Remote Query (correct approach)
    const { data: variantsWithPriceSets } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id"],
      filters: {
        id: variantIds,
      },
    })

    // Build a map of variant_id to price_set_id
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
        // Update the price set with new prices (in major units, not cents)
        // Medusa v2 stores prices in major units: $300 is stored as 300
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
        // Continue with next variant even if this one fails
      }
    }
  }
}

export default TourModuleService
