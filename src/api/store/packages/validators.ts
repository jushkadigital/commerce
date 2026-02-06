import { z } from "zod"
import { createSelectParams, createFindParams } from "@medusajs/medusa/api/utils/validators"

/**
 * Query params for GET /store/packages
 */
export const StoreGetPackagesParams = createFindParams({
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
 * Query params for GET /store/packages/:id
 */
export const StoreGetPackageParams = createSelectParams()

/**
 * Body for POST /store/packages
 */
export const StoreCreatePackageBody = z.object({
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

export type StoreGetPackagesParamsType = z.infer<typeof StoreGetPackagesParams>
export type StoreGetPackageParamsType = z.infer<typeof StoreGetPackageParams>
export type StoreCreatePackageBodyType = z.infer<typeof StoreCreatePackageBody>
