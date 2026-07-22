import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../../modules/tour/service"
import { TOUR_MODULE } from "../../../../modules/tour"
import { z } from "@medusajs/framework/zod"
import { publishProductEvent } from "../../../../workflows/helpers/publish-product-event"
import updateTourWorkflow from "../../../../workflows/update-tour"

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
        // Product fetch failed - non-critical error
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
  const validatedBody = UpdateTourSchema.parse(req.body)

  try {
    const { result } = await updateTourWorkflow(req.scope).run({
      input: { id, ...validatedBody },
      throwOnError: true,
    })

    // Publish RabbitMQ integration event ONLY when prices were updated.
    // Done in the route (not the workflow) so a failed publish never rolls back a committed mutation,
    // and a rolled-back mutation never publishes an event.
    if (validatedBody.prices && result?.product_id) {
      try {
        await publishProductEvent(req.scope, result.product_id, "updated")
      } catch (error) {
        console.error("Failed to publish product integration event:", error)
      }
    }

    // Presentation: retrieve the tour with relations + thumbnail (logic stays in the route, not the workflow)
    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const productModule = req.scope.resolve(Modules.PRODUCT)

    const updatedTour = await tourModuleService.retrieveTour(id, {
      relations: ["variants", "bookings"],
    })

    let thumbnail: string | null = null
    if (updatedTour.product_id) {
      try {
        const product = await productModule.retrieveProduct(updatedTour.product_id)
        thumbnail = product.thumbnail || null
      } catch (error) {
        // Product fetch failed - non-critical error
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
      try {
        await tourModuleService.deleteTourVariants(variantIds)
      } catch (variantError) {
        // Variant deletion failed - non-critical
      }
    }

    // 2. Delete tour bookings
    if (tour.bookings && tour.bookings.length > 0) {
      const bookingIds = tour.bookings.map((b: any) => b.id)
      try {
        await tourModuleService.deleteTourBookings(bookingIds)
      } catch (bookingError) {
        // Booking deletion failed - non-critical
      }
    }

    // 3. Delete the tour itself
    await tourModuleService.deleteTours(id)

    // 4. Also delete the associated product if exists
    if (tour.product_id) {
      try {
        await productModule.deleteProducts([tour.product_id])
      } catch (productError) {
        // Product deletion failed - non-critical, don't fail the request
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
