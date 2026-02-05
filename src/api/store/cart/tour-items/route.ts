import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IPricingModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../../../modules/tour-booking"
import TourModuleService from "../../../../modules/tour-booking/service"
import { PassengerType } from "../../../../modules/tour-booking/models/tour-variant"

/**
 * Add tour items to cart
 * POST /store/cart/tour-items
 *
 * Simplified endpoint - just pass quantities per passenger type
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as {
      cart_id: string
      tour_id: string
      tour_date: string
      adults: number
      children?: number
      infants?: number
      customer?: {
        name: string
        email?: string
        phone?: string
      }
    }

    const {
      cart_id,
      tour_id,
      tour_date,
      adults = 0,
      children = 0,
      infants = 0,
      customer
    } = body

    // Validate required fields
    if (!cart_id || !tour_id || !tour_date) {
      return res.status(400).json({
        message: "Missing required fields: cart_id, tour_id, tour_date",
      })
    }

    const totalPassengers = adults + children + infants
    if (totalPassengers === 0) {
      return res.status(400).json({
        message: "At least one passenger is required",
      })
    }

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const cartModule = req.scope.resolve(Modules.CART)
    const pricingModule: IPricingModuleService = req.scope.resolve(Modules.PRICING)

    // 1. Validate tour exists and get tour info
    const tour = await tourModuleService.retrieveTour(tour_id, {
      relations: ["variants"],
    })

    // 2. Validate tour availability
    const validation = await tourModuleService.validateBooking(
      tour_id,
      new Date(tour_date),
      totalPassengers
    )

    if (!validation.valid) {
      return res.status(400).json({
        message: "Tour not available",
        reason: validation.reason,
      })
    }

    // 3. Map variants by passenger type and collect variant IDs needed
    const variantMap = new Map<PassengerType, any>()
    const variantIdsNeeded: string[] = []

    for (const variant of tour.variants || []) {
      if (variant.variant_id) {
        variantMap.set(variant.passenger_type, variant)
      }
    }

    // 4. Validate variants exist for requested passenger types and collect IDs
    if (adults > 0) {
      const adultVariant = variantMap.get(PassengerType.ADULT)
      if (!adultVariant?.variant_id) {
        return res.status(400).json({ message: "Adult variant not found" })
      }
      variantIdsNeeded.push(adultVariant.variant_id)
    }

    if (children > 0) {
      const childVariant = variantMap.get(PassengerType.CHILD)
      if (!childVariant?.variant_id) {
        return res.status(400).json({ message: "Child variant not found" })
      }
      variantIdsNeeded.push(childVariant.variant_id)
    }

    if (infants > 0) {
      const infantVariant = variantMap.get(PassengerType.INFANT)
      if (!infantVariant?.variant_id) {
        return res.status(400).json({ message: "Infant variant not found" })
      }
      variantIdsNeeded.push(infantVariant.variant_id)
    }

    // 5. Calculate prices using Pricing Module
    // First, get cart to determine currency
    const cart = await cartModule.retrieveCart(cart_id)
    const currencyCode = cart.currency_code || "USD"

    // Calculate prices for all variants
    const calculatedPrices = await pricingModule.calculatePrices(
      { id: variantIdsNeeded },
      {
        context: {
          currency_code: currencyCode,
        },
      }
    )

    // Build price lookup map
    const priceMap = new Map<string, number>()
    for (const price of calculatedPrices) {
      const priceValue = price.calculated_amount
        ? Number(price.calculated_amount)
        : 0
      priceMap.set(price.id, priceValue)
    }

    // 6. Build pricing breakdown and calculate total
    const pricingBreakdown: Array<{
      type: string
      quantity: number
      unit_price: number
    }> = []
    let totalPrice = 0

    if (adults > 0) {
      const adultVariant = variantMap.get(PassengerType.ADULT)!
      const unitPrice = priceMap.get(adultVariant.variant_id) || 0
      const lineTotal = unitPrice * adults
      totalPrice += lineTotal
      pricingBreakdown.push({
        type: "ADULT",
        quantity: adults,
        unit_price: unitPrice,
      })
    }

    if (children > 0) {
      const childVariant = variantMap.get(PassengerType.CHILD)!
      const unitPrice = priceMap.get(childVariant.variant_id) || 0
      const lineTotal = unitPrice * children
      totalPrice += lineTotal
      pricingBreakdown.push({
        type: "CHILD",
        quantity: children,
        unit_price: unitPrice,
      })
    }

    if (infants > 0) {
      const infantVariant = variantMap.get(PassengerType.INFANT)!
      const unitPrice = priceMap.get(infantVariant.variant_id) || 0
      const lineTotal = unitPrice * infants
      totalPrice += lineTotal
      pricingBreakdown.push({
        type: "INFANT",
        quantity: infants,
        unit_price: unitPrice,
      })
    }

    // 7. Create single line item with total price and structured metadata
    const singleLineItem = {
      title: `${tour.destination} - ${tour_date}`,
      quantity: 1,
      unit_price: totalPrice,
      metadata: {
        is_tour: true,
        tour_id: tour.id,
        tour_date,
        tour_destination: tour.destination,
        tour_duration_days: tour.duration_days,
        total_passengers: totalPassengers,
        passengers: {
          adults,
          children,
          infants,
        },
        pricing_breakdown: pricingBreakdown,
        customer_name: customer?.name,
        customer_email: customer?.email,
        customer_phone: customer?.phone,
      },
    }

    // 8. Add item to cart
    await cartModule.addLineItems(cart_id, [singleLineItem] as any)

    // 6. Retrieve updated cart
    const updatedCart = await cartModule.retrieveCart(cart_id, {
      relations: ["items", "items.variant", "items.product"],
    })

    res.json({
      cart: updatedCart,
      summary: {
        tour_id: tour.id,
        destination: tour.destination,
        tour_date,
        adults,
        children,
        infants,
        total_passengers: totalPassengers,
      },
    })
  } catch (error) {
    console.error("Error adding tour items to cart:", error)
    res.status(500).json({
      message: "Failed to add tour items to cart",
      error: error.message,
    })
  }
}
