import { MedusaService, Modules } from "@medusajs/framework/utils"
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
  async getAvailableCapacity(
    tourId: string,
    tourDate: Date
  ): Promise<number> {
    const tour = await this.retrieveTour(tourId)

    const bookings = await this.listTourBookings({
      tour_id: tourId,
      tour_date: tourDate,
      status: ["confirmed", "pending"],
    })

    return tour.max_capacity - bookings.length
  }

  async validateBooking(
    tourId: string,
    tourDate: Date,
    quantity: number
  ): Promise<{ valid: boolean; reason?: string }> {
    const tour = await this.retrieveTour(tourId)

    // Validar que la fecha no sea pasada
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const requestedDateObj = new Date(tourDate)
    requestedDateObj.setHours(0, 0, 0, 0)

    if (requestedDateObj < today) {
      return {
        valid: false,
        reason: "Cannot book tours for past dates",
      }
    }

    const availableDates = tour.available_dates.map((d: string) => new Date(d).toISOString())
    const requestedDate = new Date(tourDate).toISOString()

    if (!availableDates.includes(requestedDate)) {
      return {
        valid: false,
        reason: "Tour is not available on the requested date",
      }
    }

    const availableCapacity = await this.getAvailableCapacity(tourId, tourDate)

    if (availableCapacity < quantity) {
      return {
        valid: false,
        reason: `Only ${availableCapacity} spots available`,
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
      console.warn("No container provided to updateVariantPrices, skipping pricing update")
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
      console.warn("No variant IDs found for tour", tourId)
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
        console.warn(`No price set found for variant ${existingVariant.variant_id}`)
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
