import { z, ZodEffects, ZodNullable, ZodObject, ZodOptional } from "zod"

export const createSelectParams = () => {
  return z.object({
    fields: z.string().optional(),
  })
}

