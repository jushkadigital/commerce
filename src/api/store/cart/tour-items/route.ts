import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IPricingModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, QueryContext } from "@medusajs/framework/utils"
import { generateEntityId } from "@medusajs/utils"
import { TOUR_MODULE } from "../../../../modules/tour"
import TourModuleService from "../../../../modules/tour/service"
import { PassengerType } from "../../../../modules/tour/models/tour-variant"
import { refetchPromotionAwareCart } from "../refetch-cart"

/**
 * Add tour items to cart
 * POST /store/cart/tour-items
 *
 * Simplified endpoint - just pass quantities per passenger type
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = req.body as {
      cart_id?: string
      tour_id?: string
      tour_date?: string
      adults?: number
      children?: number
      infants?: number
      customer?: {
        name: string
        email?: string
        phone?: string
        formId?: any
      }
      items?: Array<{
        variant_id: string
        quantity?: number
        unit_price?: number
        thumbnail?: string
        metadata?: Record<string, unknown>
      }>
    }

    const cart_id = body.cart_id
    let tour_id = body.tour_id
    let tour_date = body.tour_date
    let adults = Number(body.adults || 0)
    let children = Number(body.children || 0)
    let infants = Number(body.infants || 0)
    let customer = body.customer

    if (!cart_id) {
      return res.status(400).json({
        message: "Missing required field: cart_id",
      })
    }

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const cartModule = req.scope.resolve(Modules.CART)
    const pricingModule: IPricingModuleService = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const hasNativeLikeItems = Array.isArray(body.items) && body.items.length > 0
    const inputOverridesByVariant = new Map<
      string,
      {
        unit_price?: number
        thumbnail?: string
      }
    >()

    if (hasNativeLikeItems) {
      const normalizedItems = body.items!
        .map((item) => ({
          variant_id: item.variant_id,
          quantity: Number(item.quantity ?? 1),
          unit_price:
            item.unit_price !== undefined && Number.isFinite(Number(item.unit_price))
              ? Number(item.unit_price)
              : undefined,
          thumbnail_input: item.thumbnail,
          thumbnail: typeof item.thumbnail === "string" ? item.thumbnail : undefined,
          metadata: item.metadata,
        }))

      const invalidItem = normalizedItems.find((item) => {
        const hasInvalidQuantity = !item.variant_id || !Number.isFinite(item.quantity) || item.quantity <= 0
        const hasInvalidUnitPrice = item.unit_price !== undefined && item.unit_price < 0
        const hasInvalidThumbnail =
          item.thumbnail_input !== undefined && typeof item.thumbnail_input !== "string"
        return hasInvalidQuantity || hasInvalidUnitPrice || hasInvalidThumbnail
      })

      if (invalidItem) {
        return res.status(400).json({
          message:
            "Each item must include variant_id, quantity > 0, optional unit_price >= 0, and optional thumbnail as string",
        })
      }

      for (const item of normalizedItems) {
        const existingOverride = inputOverridesByVariant.get(item.variant_id)

        if (
          existingOverride?.unit_price !== undefined &&
          item.unit_price !== undefined &&
          existingOverride.unit_price !== item.unit_price
        ) {
          return res.status(400).json({
            message: "Conflicting unit_price for same variant_id",
            variant_id: item.variant_id,
          })
        }

        if (
          existingOverride?.thumbnail !== undefined &&
          item.thumbnail !== undefined &&
          existingOverride.thumbnail !== item.thumbnail
        ) {
          return res.status(400).json({
            message: "Conflicting thumbnail for same variant_id",
            variant_id: item.variant_id,
          })
        }

        inputOverridesByVariant.set(item.variant_id, {
          unit_price: item.unit_price ?? existingOverride?.unit_price,
          thumbnail: item.thumbnail ?? existingOverride?.thumbnail,
        })
      }

      const uniqueVariantIds = [...new Set(normalizedItems.map((item) => item.variant_id))]

      const tourVariants = await tourModuleService.listTourVariants({
        variant_id: uniqueVariantIds,
      })

      const tourVariantByVariantId = new Map<string, { tour_id: string; passenger_type: PassengerType }>()
      for (const tv of tourVariants) {
        tourVariantByVariantId.set(tv.variant_id, {
          tour_id: tv.tour_id,
          passenger_type: tv.passenger_type,
        })
      }

      const missingVariantIds = uniqueVariantIds.filter((id) => !tourVariantByVariantId.has(id))
      if (missingVariantIds.length > 0) {
        return res.status(400).json({
          message: "Some variants are not linked to any tour",
          variant_ids: missingVariantIds,
        })
      }

      const derivedTourIds = [
        ...new Set(
          uniqueVariantIds.map((id) => tourVariantByVariantId.get(id)!.tour_id)
        ),
      ]

      if (derivedTourIds.length !== 1) {
        return res.status(400).json({
          message: "All items must belong to the same tour",
        })
      }

      const derivedTourId = derivedTourIds[0]

      if (tour_id && tour_id !== derivedTourId) {
        return res.status(400).json({
          message: "tour_id does not match the provided variants",
        })
      }

      tour_id = derivedTourId

      const itemTourDates = normalizedItems
        .map((item) => {
          const value = item.metadata?.tour_date
          return typeof value === "string" ? value : undefined
        })
        .filter((value): value is string => Boolean(value))

      if (!tour_date && itemTourDates.length > 0) {
        tour_date = itemTourDates[0]
      }

      if (!tour_date) {
        return res.status(400).json({
          message: "Missing required field: tour_date",
        })
      }

      if (itemTourDates.some((dateValue) => dateValue !== tour_date)) {
        return res.status(400).json({
          message: "All items metadata.tour_date must match the requested tour_date",
        })
      }

      if (!customer) {
        const customerMetadata = normalizedItems
          .map((item) => item.metadata || {})
          .find((meta) =>
            typeof meta.customer_name === "string" ||
            typeof meta.customer_email === "string" ||
            typeof meta.customer_phone === "string" ||
            typeof meta.formId === "number"
          )

        if (customerMetadata) {
          customer = {
            name: (customerMetadata.customer_name as string) || "",
            email:
              typeof customerMetadata.customer_email === "string"
                ? (customerMetadata.customer_email as string)
                : undefined,
            phone:
              typeof customerMetadata.customer_phone === "string"
                ? (customerMetadata.customer_phone as string)
                : undefined,
            formId: customerMetadata.formId
          }
        }
      }

      adults = 0
      children = 0
      infants = 0

      for (const item of normalizedItems) {
        const tourVariant = tourVariantByVariantId.get(item.variant_id)!
        const quantity = item.quantity

        if (tourVariant.passenger_type === PassengerType.ADULT) {
          adults += quantity
        } else if (tourVariant.passenger_type === PassengerType.CHILD) {
          children += quantity
        } else if (tourVariant.passenger_type === PassengerType.INFANT) {
          infants += quantity
        }
      }
    } else {
      if (!tour_id || !tour_date) {
        return res.status(400).json({
          message: "Missing required fields: cart_id, tour_id, tour_date",
        })
      }
    }

    const totalPassengers = adults + children + infants
    if (totalPassengers === 0) {
      return res.status(400).json({
        message: "At least one passenger is required",
      })
    }

    // 1. Validate tour exists and get tour info
    const tour = await tourModuleService.retrieveTour(tour_id!, {
      relations: ["variants"],
    })

    // 2. Validate tour availability
    const validation = await tourModuleService.validateBooking(
      tour_id!,
      new Date(tour_date!),
      totalPassengers
    )

    if (!validation.valid) {
      console.log("Tour not available - Reason:", validation.reason)
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

    const cart = await cartModule.retrieveCart(cart_id)
    const pricingContext = {
      ...((req as any).pricingContext || {}),
      currency_code: (cart.currency_code || "usd").toLowerCase(),
      region_id: cart.region_id,
    }

    const priceMap = new Map<string, number>()

    if (hasNativeLikeItems) {
      for (const [variantId, override] of inputOverridesByVariant.entries()) {
        if (override.unit_price !== undefined) {
          priceMap.set(variantId, override.unit_price)
        }
      }
    }

    try {
      const calculatedPrices = await pricingModule.calculatePrices(
        { id: variantIdsNeeded },
        {
          context: pricingContext,
        }
      )

      for (const calculatedPrice of calculatedPrices) {
        const amount = Number(calculatedPrice.calculated_amount)
        if (Number.isFinite(amount) && amount >= 0) {
          priceMap.set(calculatedPrice.id, amount)
        }
      }
    } catch (pricingError) {
      console.warn("Could not pre-calculate variant prices for metadata", pricingError)
    }

    const unresolvedVariantIds = variantIdsNeeded.filter((variantId) => !priceMap.has(variantId))

    if (unresolvedVariantIds.length > 0) {
      try {
        const { data: variantsWithPrices } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set.prices.*"],
          filters: {
            id: unresolvedVariantIds,
          },
        })

        for (const variantData of variantsWithPrices || []) {
          const prices = variantData?.price_set?.prices || []
          const matchingPrice = prices.find(
            (price: any) => price?.currency_code?.toLowerCase() === pricingContext.currency_code
          )

          if (!matchingPrice) {
            continue
          }

          const amount = Number(matchingPrice.amount)
          if (Number.isFinite(amount) && amount >= 0) {
            priceMap.set(variantData.id, amount)
          }
        }
      } catch (variantPriceError) {
        console.warn("Could not resolve variant prices from price sets", variantPriceError)
      }
    }

    const unresolvedAfterPriceSetIds = variantIdsNeeded.filter((variantId) => !priceMap.has(variantId))

    if (unresolvedAfterPriceSetIds.length > 0) {
      try {
        const { data: variantsWithCalculatedPrice } = await query.graph({
          entity: "product_variant",
          fields: ["id", "calculated_price.*"],
          filters: {
            id: unresolvedAfterPriceSetIds,
          },
          context: {
            calculated_price: QueryContext(pricingContext),
          },
        })

        for (const variantData of variantsWithCalculatedPrice || []) {
          const variantAny = variantData as any
          const amount = Number(variantAny?.calculated_price?.calculated_amount)
          if (Number.isFinite(amount) && amount >= 0) {
            priceMap.set(variantAny.id, amount)
          }
        }
      } catch (calculatedPriceError) {
        console.warn("Could not resolve variant calculated prices", calculatedPriceError)
      }
    }

    const missingPriceVariantIds = variantIdsNeeded.filter((variantId) => !priceMap.has(variantId))

    if (missingPriceVariantIds.length > 0) {
      return res.status(400).json({
        message: "Missing variant prices for cart currency",
        variant_ids: missingPriceVariantIds,
        currency_code: pricingContext.currency_code,
      })
    }

    // 6. Build pricing breakdown and calculate total
    const pricingBreakdown: Array<{
      type: string
      quantity: number
      unit_price: number
    }> = []
    let totalPrice = 0

    const getUnitPrice = (variantId: string) => {
      const resolved = priceMap.get(variantId)
      if (resolved === undefined) {
        throw new Error(`Missing price for variant ${variantId}`)
      }

      return resolved
    }

    if (adults > 0) {
      const adultVariant = variantMap.get(PassengerType.ADULT)!
      const unitPrice = getUnitPrice(adultVariant.variant_id)
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
      const unitPrice = getUnitPrice(childVariant.variant_id)
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
      const unitPrice = getUnitPrice(infantVariant.variant_id)
      const lineTotal = unitPrice * infants
      totalPrice += lineTotal
      pricingBreakdown.push({
        type: "INFANT",
        quantity: infants,
        unit_price: unitPrice,
      })
    }

    const groupId = generateEntityId(undefined, "tour")


    const variantBreakdown: Array<{
      type: "ADULT" | "CHILD" | "INFANT"
      variant_id: string
      quantity: number
      unit_price: number
      line_total: number
    }> = []

    if (adults > 0) {
      const adultVariant = variantMap.get(PassengerType.ADULT)!
      const unitPrice = getUnitPrice(adultVariant.variant_id)
      variantBreakdown.push({
        type: "ADULT",
        variant_id: adultVariant.variant_id,
        quantity: adults,
        unit_price: unitPrice,
        line_total: unitPrice * adults,
      })
    }

    if (children > 0) {
      const childVariant = variantMap.get(PassengerType.CHILD)!
      const unitPrice = getUnitPrice(childVariant.variant_id)
      variantBreakdown.push({
        type: "CHILD",
        variant_id: childVariant.variant_id,
        quantity: children,
        unit_price: unitPrice,
        line_total: unitPrice * children,
      })
    }

    if (infants > 0) {
      const infantVariant = variantMap.get(PassengerType.INFANT)!
      const unitPrice = getUnitPrice(infantVariant.variant_id)
      variantBreakdown.push({
        type: "INFANT",
        variant_id: infantVariant.variant_id,
        quantity: infants,
        unit_price: unitPrice,
        line_total: unitPrice * infants,
      })
    }

    const itemsToAdd: any[] = variantBreakdown.map((entry) => {
      const passengers = {
        adults: entry.type === "ADULT" ? entry.quantity : 0,
        children: entry.type === "CHILD" ? entry.quantity : 0,
        infants: entry.type === "INFANT" ? entry.quantity : 0,
      }

      return {
        variant_id: entry.variant_id,
        quantity: entry.quantity,
        requires_shipping: false,
        unit_price: entry.unit_price,
        thumbnail: inputOverridesByVariant.get(entry.variant_id)?.thumbnail || tour.thumbnail,
        title: `${tour.destination} (${entry.type})`,
        metadata: {
          is_tour: true,
          tour_id: tour.id,
          tour_date: tour_date!,
          tour_destination: tour.destination,
          tour_duration_days: tour.duration_days,
          passenger_type: entry.type,
          total_passengers: totalPassengers,
          line_passengers: entry.quantity,
          passengers,
          group_id: groupId,
          pricing_breakdown: pricingBreakdown,
          variant_breakdown: variantBreakdown,
          customer_name: customer?.name,
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          formId: customer?.formId
        },
      }
    })

    if (itemsToAdd.length === 0) {
      return res.status(400).json({
        message: "No passenger variants found to add",
      })
    }


    await cartModule.addLineItems(cart_id, itemsToAdd)

    // 6. Retrieve updated cart
    const updatedCart = await refetchPromotionAwareCart(cart_id, req.scope)

    res.json({
      cart: updatedCart,
      summary: {
        tour_id: tour.id,
        destination: tour.destination,
        tour_date: tour_date!,
        adults,
        children,
        infants,
        total_passengers: totalPassengers,
      },
    })
  } catch (error) {
    console.error("Error adding tour items to cart:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    res.status(500).json({
      message: "Failed to add tour items to cart",
      error: errorMessage,
    })
  }
}
