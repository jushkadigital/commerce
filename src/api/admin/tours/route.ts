import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../modules/tour-booking"
import createTourWorkflow from "../../../workflows/create-tour"
import { z } from "zod"


export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const {
    data: tours,
    metadata
  } = await query.graph({
    entity: "tour",
    ...req.queryConfig,
  })

  res.json({
    tours: tours,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}


export const CreateTourSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  description: z.string().optional(),
  duration_days: z.number().int().positive("Duration must be at least 1 day"),
  max_capacity: z.number().int().positive("Max capacity must be at least 1"),
  available_dates: z.array(z.string()),
  thumbnail: z.string().optional(),
  prices: z.object({
    adult: z.number().min(0, "Adult price must be non-negative"),
    child: z.number().min(0, "Child price must be non-negative"),
    infant: z.number().min(0, "Infant price must be non-negative"),
    currency_code: z.string().optional(),
  }),
})
type CreateTourType = z.infer<typeof CreateTourSchema>

export async function POST(
  req: MedusaRequest<CreateTourType>,
  res: MedusaResponse
) {

  const { result } = await createTourWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  // Retornamos el resultado directamente (el workflow ya devuelve el objeto completo)
  res.json(result)
}
