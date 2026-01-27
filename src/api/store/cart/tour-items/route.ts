import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
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

    // 3. Map variants by passenger type
    const variantMap = new Map<PassengerType, any>()
    for (const variant of tour.variants || []) {
      if (variant.variant_id) {
        variantMap.set(variant.passenger_type, variant)
      }
    }

    // 4. Prepare line items (one per passenger type with quantity)
    const lineItems: any[] = []
    const baseMetadata = {
      tour_id,
      tour_date,
      tour_destination: tour.destination,
      tour_duration_days: tour.duration_days,
      customer_name: customer?.name,
      customer_email: customer?.email,
      customer_phone: customer?.phone,
    }

    if (adults > 0) {
      const adultVariant = variantMap.get(PassengerType.ADULT)
      if (!adultVariant?.variant_id) {
        return res.status(400).json({ message: "Adult variant not found" })
      }
      lineItems.push({
        variant_id: adultVariant.variant_id,
        quantity: adults,
        metadata: { ...baseMetadata, passenger_type: PassengerType.ADULT },
      })
    }

    if (children > 0) {
      const childVariant = variantMap.get(PassengerType.CHILD)
      if (!childVariant?.variant_id) {
        return res.status(400).json({ message: "Child variant not found" })
      }
      lineItems.push({
        variant_id: childVariant.variant_id,
        quantity: children,
        metadata: { ...baseMetadata, passenger_type: PassengerType.CHILD },
      })
    }

    if (infants > 0) {
      const infantVariant = variantMap.get(PassengerType.INFANT)
      if (!infantVariant?.variant_id) {
        return res.status(400).json({ message: "Infant variant not found" })
      }
      lineItems.push({
        variant_id: infantVariant.variant_id,
        quantity: infants,
        metadata: { ...baseMetadata, passenger_type: PassengerType.INFANT },
      })
    }

    // 5. Add items to cart
    await cartModule.addLineItems(cart_id, lineItems as any)

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
