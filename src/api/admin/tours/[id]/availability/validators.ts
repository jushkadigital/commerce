import { z } from "zod"

export const GetTourAvailabilityParamsSchema = z.object({
  start_date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    "start_date must be a valid date (YYYY-MM-DD format)"
  ).transform((val) => new Date(val)),
  end_date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    "end_date must be a valid date (YYYY-MM-DD format)"
  ).transform((val) => new Date(val)),
})

export type GetTourAvailabilityParams = z.infer<typeof GetTourAvailabilityParamsSchema>
