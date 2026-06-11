import { z } from "zod"

export const BookingConfirmedV1Schema = z.object({
  id: z.string().optional(),
  order_id: z.string(),
  tour_id: z.string().optional(),
  package_id: z.string().optional(),
  entity_type: z.enum(["tour", "package"]).optional(),
  tour_date: z.string().optional(),
  package_date: z.string().optional(),
  status: z.string(),
  passengers: z.array(z.record(z.string(), z.unknown())).optional(),
  line_items: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const BookingCancelledV1Schema = z.object({
  id: z.string(),
  order_id: z.string(),
  reason: z.string().optional(),
})
