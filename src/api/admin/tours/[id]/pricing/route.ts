import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import TourModuleService from "../../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"

/**
 * GET /admin/tours/:id/pricing
 * Get current pricing for a tour from Pricing Module
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Get tour with variants
    const tour = await tourModuleService.retrieveTour(id, {
      relations: ["variants"],
    })

    if (!tour) {
      return res.status(404).json({ message: "Tour not found" })
    }

    // Initialize prices structure
    const prices: any = {
      adult: { PEN: 0, USD: 0 },
      child: { PEN: 0, USD: 0 },
      infant: { PEN: 0, USD: 0 },
    }

    // Get variant IDs
    const variantIds = (tour.variants || [])
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      return res.json({
        tour: {
          id: tour.id,
          destination: tour.destination,
          description: tour.description,
        },
        prices,
      })
    }

    // Query variants with their price sets and prices using Remote Query
    const { data: variantsWithPrices } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id", "price_set.prices.*"],
      filters: {
        id: variantIds,
      },
    })

    console.log("Variants with prices from query:", JSON.stringify(variantsWithPrices, null, 2))

    // Map variant IDs to their prices
    const variantPricesMap = new Map<string, any[]>()
    for (const variantData of variantsWithPrices || []) {
      if (variantData.price_set?.prices) {
        variantPricesMap.set(variantData.id, variantData.price_set.prices)
      }
    }

    // Build the prices response
    for (const variant of tour.variants || []) {
      if (!variant.variant_id) continue

      const variantPrices = variantPricesMap.get(variant.variant_id)
      if (!variantPrices) continue

      for (const price of variantPrices) {
        const currency = price.currency_code?.toUpperCase() // Normalize to uppercase for UI
        // NOTE: Medusa v2 stores prices in MAJOR UNITS (not cents)
        // So the amount is already the display value (e.g., 300 for $300)
        const amount = Number(price.amount)
        console.log(`[PRICING DEBUG GET] ${variant.passenger_type} ${currency}: amount=${amount} (major units)`)

        switch (variant.passenger_type) {
          case "adult":
            if (currency === "PEN" || currency === "USD") {
              prices.adult[currency] = amount
            }
            break
          case "child":
            if (currency === "PEN" || currency === "USD") {
              prices.child[currency] = amount
            }
            break
          case "infant":
            if (currency === "PEN" || currency === "USD") {
              prices.infant[currency] = amount
            }
            break
        }
      }
    }

    res.json({
      tour: {
        id: tour.id,
        destination: tour.destination,
        description: tour.description,
        product_id: tour.product_id,
      },
      prices,
    })
  } catch (error) {
    console.error("Error fetching tour pricing:", error)
    res.status(500).json({
      message: "Failed to fetch tour pricing",
      error: error.message,
    })
  }
}

/**
 * PUT /admin/tours/:id/pricing
 * Update pricing for a tour via Pricing Module directly
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { prices } = req.body as {
      prices: {
        adult: { PEN: number; USD: number }
        child: { PEN: number; USD: number }
        infant: { PEN: number; USD: number }
      }
    }

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Get tour with variants
    const tour = await tourModuleService.retrieveTour(id, {
      relations: ["variants"],
    })

    if (!tour) {
      return res.status(404).json({ message: "Tour not found" })
    }

    if (!tour.variants || tour.variants.length === 0) {
      return res.status(400).json({
        message: "No variants found for this tour",
      })
    }

    console.log("Tour variants:", JSON.stringify(tour.variants, null, 2))

    // Get variant IDs
    const variantIds = tour.variants
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    // Query existing price sets for all variants using Remote Query
    const { data: variantsWithPriceSets } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id"],
      filters: {
        id: variantIds,
      },
    })

    console.log("Variants with price sets:", JSON.stringify(variantsWithPriceSets, null, 2))

    // Build a map of variant_id to price_set_id
    const variantToPriceSetMap = new Map<string, string>()
    for (const variantData of variantsWithPriceSets || []) {
      if (variantData.price_set?.id) {
        variantToPriceSetMap.set(variantData.id, variantData.price_set.id)
      }
    }

    console.log("Variant to price set map:", Array.from(variantToPriceSetMap.entries()))

    // Update prices for each variant directly using the Pricing Module
    for (const variant of tour.variants) {
      if (!variant.variant_id) {
        console.warn("Variant missing variant_id:", variant)
        continue
      }

      const priceSetId = variantToPriceSetMap.get(variant.variant_id)
      if (!priceSetId) {
        console.warn(`No price set found for variant ${variant.variant_id}`)
        continue
      }

      const passengerType = variant.passenger_type as "adult" | "child" | "infant"
      const passengerPrices = prices[passengerType]

      if (!passengerPrices) continue

      // Build prices array for this price set
      // NOTE: Medusa v2 stores prices in MAJOR UNITS (not cents)
      // So $300 is stored as 300, not 30000
      const pricesArray: any[] = []
      for (const [currency, amount] of Object.entries(passengerPrices)) {
        console.log(`[PRICING DEBUG] ${passengerType} ${currency}: UI value=${amount} (stored as major units)`)
        pricesArray.push({
          amount: amount as number,
          currency_code: currency.toLowerCase(), // Medusa expects lowercase
        })
      }

      console.log(`[PRICING DEBUG] Updating price set ${priceSetId} for ${passengerType}:`, JSON.stringify(pricesArray))

      // Update the price set directly
      await pricingModule.updatePriceSets(priceSetId, {
        prices: pricesArray,
      })
    }

    res.json({
      tour: {
        id: tour.id,
        destination: tour.destination,
      },
      prices,
      message: "Pricing updated successfully",
    })
  } catch (error) {
    console.error("Error updating tour pricing:", error)
    res.status(500).json({
      message: "Failed to update tour pricing",
      error: error.message,
    })
  }
}
