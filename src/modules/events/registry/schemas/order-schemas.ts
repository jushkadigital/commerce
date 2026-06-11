import { z } from "zod"

export const OrderPlacedV1Schema = z.object({
  id: z.string(),
  display_id: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  total: z.number().optional(),
  currency_code: z.string().optional(),
  items: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const OrderUpdatedV1Schema = OrderPlacedV1Schema.partial().required({ id: true })
