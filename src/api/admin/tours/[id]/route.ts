import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../../modules/tour/service"
import { TOUR_MODULE } from "../../../../modules/tour"
import { z } from "zod"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const tour = await tourModuleService.retrieveTour(id, {
    relations: ["variants", "bookings"],
  })

  // Get thumbnail from product
  let thumbnail: string | null = null
  if (tour.product_id) {
    try {
      const product = await productModule.retrieveProduct(tour.product_id)
      thumbnail = product.thumbnail || null
    } catch (error) {
      console.warn(`Could not fetch product ${tour.product_id}:`, error)
    }
  }

  res.json({ tour: { ...tour, thumbnail } })
}


// Esquema de validación para los datos que vienen del Modal
const UpdateTourSchema = z.object({
  destination: z.string().optional(),
  description: z.string().optional(),
  duration_days: z.coerce.number().optional(), // 'coerce' convierte strings a números automáticamente
  max_capacity: z.coerce.number().optional(),
  is_special: z.boolean().optional(),
  thumbnail: z.string().optional(),
  prices: z.object({
    adult: z.coerce.number().optional(),
    child: z.coerce.number().optional(),
    infant: z.coerce.number().optional(),
    currency_code: z.string().optional(),
  }).optional(),
  booking_min_days_ahead: z.coerce.number().optional(),
  blocked_dates: z.array(z.string()).optional(),
  blocked_week_days: z.array(z.string()).optional(),
  cancellation_deadline_hours: z.coerce.number().optional(),
})


type UpdateTourSchemaType = z.infer<typeof UpdateTourSchema>

export const POST = async (
  req: MedusaRequest<UpdateTourSchemaType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)

  console.log("========== TOUR UPDATE REQUEST ==========")
  console.log("Tour ID:", id)
  console.log("Request Body (RAW):", JSON.stringify(req.body, null, 2))
  console.log("=========================================")
  
  // 1. Validar los datos de entrada
  const validatedBody = UpdateTourSchema.parse(req.body)
  
  console.log("========== AFTER VALIDATION ==========")
  console.log("Validated Body:", JSON.stringify(validatedBody, null, 2))
  console.log("=======================================")

  const updateData: Record<string, unknown> = {}

  if ("slug" in validatedBody) updateData.slug = (validatedBody as any).slug
  if ("destination" in validatedBody) updateData.destination = validatedBody.destination
  if ("description" in validatedBody) updateData.description = validatedBody.description
  if ("duration_days" in validatedBody) updateData.duration_days = validatedBody.duration_days
  if ("max_capacity" in validatedBody) updateData.max_capacity = validatedBody.max_capacity
  if ("thumbnail" in validatedBody) updateData.thumbnail = validatedBody.thumbnail
  if ("is_special" in validatedBody) updateData.is_special = validatedBody.is_special
  if ("booking_min_days_ahead" in validatedBody) updateData.booking_min_days_ahead = validatedBody.booking_min_days_ahead
  if ("blocked_dates" in validatedBody) updateData.blocked_dates = validatedBody.blocked_dates
  if ("blocked_week_days" in validatedBody) updateData.blocked_week_days = validatedBody.blocked_week_days
  if ("cancellation_deadline_hours" in validatedBody) updateData.cancellation_deadline_hours = validatedBody.cancellation_deadline_hours

  try {
    await tourModuleService.updateTours([{ id, ...updateData }])

    if (validatedBody.prices) {
      await tourModuleService.updateVariantPrices(id, validatedBody.prices, req.scope)
    }

    const currentTour = await tourModuleService.retrieveTour(id)

    if (currentTour.product_id) {
      const productUpdateData: Record<string, unknown> = { id: currentTour.product_id }

      if (validatedBody.destination) {
        productUpdateData.title = `${validatedBody.destination}${validatedBody.duration_days ? ` - ${validatedBody.duration_days} Days` : ""}`
      }

      if (validatedBody.description) {
        productUpdateData.description = validatedBody.description
      }

      if (Object.keys(productUpdateData).length > 1) {
        await productModule.updateProducts(currentTour.product_id, productUpdateData)
      }
    }

    const updatedTour = await tourModuleService.retrieveTour(id, {
      relations: ["variants", "bookings"],
    })

    let thumbnail: string | null = null
    if (updatedTour.product_id) {
      try {
        const product = await productModule.retrieveProduct(updatedTour.product_id)
        thumbnail = product.thumbnail || null
      } catch (error) {
        console.warn(`Could not fetch product ${updatedTour.product_id}:`, error)
      }
    }

    res.json({ tour: { ...updatedTour, thumbnail } })
  } catch (error: any) {
    console.error("Failed to update tour", error)
    res.status(500).json({
      message: "Failed to update tour",
      errors: [error.message],
    })
  }
}

// PUT and PATCH both do partial updates

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const productModule = req.scope.resolve(Modules.PRODUCT)

    // Get tour with relations to find associated entities
    const tour = await tourModuleService.retrieveTour(id, {
      relations: ["variants", "bookings"],
    }).catch(() => null)

    if (!tour) {
      return res.status(404).json({ message: "Tour not found" })
    }

    // 1. Delete tour variants first (to avoid relationship errors)
    if (tour.variants && tour.variants.length > 0) {
      const variantIds = tour.variants.map((v: any) => v.id)
      console.log(`Deleting ${variantIds.length} variants for tour ${id}`)
      try {
        await tourModuleService.deleteTourVariants(variantIds)
      } catch (variantError) {
        console.warn("Could not delete variants:", variantError)
      }
    }

    // 2. Delete tour bookings
    if (tour.bookings && tour.bookings.length > 0) {
      const bookingIds = tour.bookings.map((b: any) => b.id)
      console.log(`Deleting ${bookingIds.length} bookings for tour ${id}`)
      try {
        await tourModuleService.deleteTourBookings(bookingIds)
      } catch (bookingError) {
        console.warn("Could not delete bookings:", bookingError)
      }
    }

    // 3. Delete the tour itself
    await tourModuleService.deleteTours(id)
    console.log(`Deleted tour ${id}`)

    // 4. Also delete the associated product if exists
    if (tour.product_id) {
      try {
        await productModule.deleteProducts([tour.product_id])
        console.log(`Deleted associated product ${tour.product_id}`)
      } catch (productError) {
        console.warn(`Could not delete product ${tour.product_id}:`, productError)
        // Don't fail the request if product deletion fails
      }
    }

    res.json({ id, deleted: true })
  } catch (error: any) {
    console.error("Error deleting tour:", error)
    res.status(500).json({
      message: "Failed to delete tour",
      error: error.message,
    })
  }
}
