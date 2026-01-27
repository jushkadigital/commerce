import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../modules/tour-booking"
import { z } from "zod"
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
  available_dates: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  prices: z.object({
    adult: z.coerce.number().optional(),
    child: z.coerce.number().optional(),
    infant: z.coerce.number().optional(),
    currency_code: z.string().optional(),
  }).optional(),
})


type UpdateTourSchemaType = z.infer<typeof UpdateTourSchema>

export const POST = async (
  req: MedusaRequest<UpdateTourSchemaType>,
  res: MedusaResponse
) => {
  const { id } = req.params

  console.log(req.params)
  // 1. Validar los datos de entrada
  const validatedBody = UpdateTourSchema.parse(req.body)

  // 2. Ejecutar el workflow de actualización
  const { result, errors } = await updateTourWorkflow(req.scope).run({
    input: {
      id,
      ...validatedBody,
    },
    throwOnError: false, // Manejamos los errores manualmente abajo
  })

  // 3. Manejo de errores
  if (errors.length > 0) {
    res.status(500).json({
      message: "Failed to update tour",
      errors: errors.map((e) => e.error.message),
    })
    return
  }

  // 4. Retornar el tour actualizado
  res.json({ tour: result.tour })
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
