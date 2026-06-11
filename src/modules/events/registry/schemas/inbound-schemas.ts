import { z } from "zod"

export const InboundTourCreatedV1Schema = z.object({
  id: z.string(),
  data: z.object({
    destination: z.string(),
    description: z.unknown(),
    duration_days: z.number(),
    max_capacity: z.number().optional().default(20),
    thumbnail: z.string().optional(),
    price: z.number().optional(),
  }),
})

export const InboundTourUpdatedV1Schema = InboundTourCreatedV1Schema.partial().required({ id: true })

export const InboundTourDeletedV1Schema = z.object({
  id: z.string(),
  payloadId: z.string().optional(),
})

export const InboundPackageCreatedV1Schema = z.object({
  id: z.string(),
  data: z.object({
    destination: z.string().optional(),
    description: z.unknown().optional(),
    duration_days: z.number().optional(),
    max_capacity: z.number().optional().default(20),
    thumbnail: z.string().optional(),
    price: z.number().optional(),
  }),
})

export const InboundPackageUpdatedV1Schema = InboundPackageCreatedV1Schema.partial().required({ id: true })

export const InboundPackageDeletedV1Schema = z.object({
  id: z.string(),
  payloadId: z.string().optional(),
})

export const InboundPaymentReceivedV1Schema = z.object({
  id: z.string(),
  order_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
})
