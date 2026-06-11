import { z } from "@medusajs/framework/zod"

export const createSelectParams = () => {
  return z.object({
    fields: z.string().optional(),
  })
}

