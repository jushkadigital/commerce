import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../../../modules/tour-booking"
import { z } from "zod"
import { updateTourNoPriceWorkflow } from "../../../../../workflows/update-tour-no-prices"

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

  console.log("ENTRO A NO PRICES")

  // 2. Ejecutar el workflow de actualización
  const { result, errors } = await updateTourNoPriceWorkflow(req.scope).run({
    input: {
      id,
      ...validatedBody,
    },
    throwOnError: true, // Manejamos los errores manualmente abajo
  })

  // 3. Manejo de errores


  // 4. Retornar el tour actualizado
  res.json({ tour: result.tour })
}
