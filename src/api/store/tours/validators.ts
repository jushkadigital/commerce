import { z } from "zod"
import { createSelectParams, createFindParams } from "@medusajs/medusa/api/utils/validators"

/**
 * Query params for GET /store/tours
 */
export const StoreGetToursParams = createFindParams({
  limit: 20,
  offset: 0,
}).merge(
  z.object({
    q: z.string().optional(),
    destination: z.string().optional(),
    duration_days: z.coerce.number().optional(),
  })
)

/**
 * Query params for GET /store/tours/:id
 */
export const StoreGetTourParams = createSelectParams()

/**
 * Body for POST /store/tours
 */
export const StoreCreateTourBody = z.object({
  destination: z.string().min(1, "Destination is required"),
  description: z.string().optional(),
  duration_days: z.number().int().positive("Duration must be a positive integer"),
  max_capacity: z.number().int().positive("Max capacity must be a positive integer"),
  available_dates: z.array(z.string()).min(1, "At least one available date is required"),
  thumbnail: z.string().url().optional(),
  prices: z.object({
    adult: z.number().positive("Adult price must be positive"),
    child: z.number().min(0, "Child price cannot be negative"),
    infant: z.number().min(0, "Infant price cannot be negative"),
    currency_code: z.string().length(3).optional(),
  }),
})

export type StoreGetToursParamsType = z.infer<typeof StoreGetToursParams>
export type StoreGetTourParamsType = z.infer<typeof StoreGetTourParams>
export type StoreCreateTourBodyType = z.infer<typeof StoreCreateTourBody>
