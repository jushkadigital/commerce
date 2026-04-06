import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import createPackageWorkflow from "../../../workflows/create-package"
import { z } from "zod"


export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const {
    data: packages,
    metadata
  } = await query.graph({
    entity: "package",
    ...req.queryConfig,
  })

  res.json({
    packages: packages,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}


export const CreatePackageSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  description: z.string().optional(),
  duration_days: z.number().int().positive("Duration must be at least 1 day"),
  max_capacity: z.number().int().positive("Max capacity must be at least 1"),
  is_special: z.boolean().optional(),
  blocked_dates: z.array(z.string()).optional(),
  blocked_week_days: z.array(z.string()).optional(),
  cancellation_deadline_hours: z.number().int().nonnegative().optional(),
  booking_min_days_ahead: z.number().int().nonnegative().optional(),
  thumbnail: z.string().optional(),
  metadata: z.record(z.unknown()) // Acepta un objeto con cualquier clave y valor
    .nullable()          // Permite que sea null
    .optional(),
  prices: z.object({
    adult: z.number().min(0, "Adult price must be non-negative"),
    child: z.number().min(0, "Child price must be non-negative"),
    infant: z.number().min(0, "Infant price must be non-negative"),
    currency_code: z.string().optional(),
  }),
})
type CreatePackageType = z.infer<typeof CreatePackageSchema>

export async function POST(
  req: MedusaRequest<CreatePackageType>,
  res: MedusaResponse
) {

  const input = {
    ...req.validatedBody,
    metadata: req.validatedBody.metadata ?? undefined,
  }

  const { result } = await createPackageWorkflow(req.scope).run({
    input,
  })

  // Retornamos el resultado directamente (el workflow ya devuelve el objeto completo)
  res.json(result)
}
