import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"
import TourModuleService from "../../../../../modules/tour-booking/service"

/**
 * POST /store/carts/:id/validate-tours
 * Validates tour availability before checkout
 * Call this endpoint BEFORE initiating payment
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id: cartId } = req.params
    const cartModule = req.scope.resolve(Modules.CART)
    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

    // Get cart with line items
    const cart = await cartModule.retrieveCart(cartId, {
      relations: ["items"],
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Extract tour items from cart
    const tourItems = (cart.items || []).filter(
      (item: any) => item.metadata?.tour_id
    )

    if (tourItems.length === 0) {
      return res.json({
        valid: true,
        message: "No tour items in cart",
        tour_items: [],
      })
    }

    // Group by tour_id + tour_date to count passengers
    const tourDateMap = new Map<string, {
      tour_id: string
      tour_date: string
      count: number
      passengers: string[]
    }>()

    for (const item of tourItems) {
      const { tour_id, tour_date, passenger_name } = item.metadata as any
      const key = `${tour_id}:${tour_date}`

      if (!tourDateMap.has(key)) {
        tourDateMap.set(key, {
          tour_id,
          tour_date,
          count: 0,
          passengers: [],
        })
      }

      const entry = tourDateMap.get(key)!
      entry.count += 1
      entry.passengers.push(passenger_name || "Unknown")
    }

    // Validate each tour/date combination
    const validationResults: Array<{
      tour_id: string
      tour_date: string
      passengers: number
      available: boolean
      capacity: number
      reason?: string
    }> = []

    let allValid = true

    for (const [_, data] of tourDateMap.entries()) {
      const validation = await tourModuleService.validateBooking(
        data.tour_id,
        new Date(data.tour_date),
        data.count
      )

      const availableCapacity = await tourModuleService.getAvailableCapacity(
        data.tour_id,
        new Date(data.tour_date)
      )

      const result = {
        tour_id: data.tour_id,
        tour_date: data.tour_date,
        passengers: data.count,
        available: validation.valid,
        capacity: availableCapacity,
        reason: validation.reason,
      }

      validationResults.push(result)

      if (!validation.valid) {
        allValid = false
      }
    }

    res.json({
      valid: allValid,
      message: allValid
        ? "All tours are available"
        : "Some tours are not available",
      tour_items: validationResults,
    })
  } catch (error: any) {
    console.error("Error validating cart tours:", error)
    res.status(500).json({
      valid: false,
      message: "Failed to validate tour availability",
      error: error.message,
    })
  }
}
