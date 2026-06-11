import { z } from "zod"

const DestinationRef = z.object({
  name: z.string(),
})

const MeiliThumbnail = z.object({
  large: z.string().optional(),
  medium: z.string().optional(),
})

const PackageData = z.object({
  destination: z.string(),
  description: z.record(z.unknown()),
  duration_days: z.number().int().min(1),
  max_capacity: z.number().int().min(1).optional().default(20),
  thumbnail: z.string(),
  completeThumbnail: MeiliThumbnail.optional(),
  price: z.number(),
  destinos: z.array(DestinationRef),
  difficulty: z.string(),
})

export const PackagePublishedV1Schema = z.object({
  id: z.number(),
  slug: z.string(),
  data: PackageData,
})

export const PackageUpdatedV1Schema = PackagePublishedV1Schema

export const PackageDeletedV1Schema = z.object({
  id: z.number(),
  slug: z.string().optional(),
})
