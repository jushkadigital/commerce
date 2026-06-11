import { z } from "zod"

export const PaymentReceivedV1Schema = z.object({
  transaction_id: z.string().optional(),
  order_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  payment_method: z.string().optional(),
  processed_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
