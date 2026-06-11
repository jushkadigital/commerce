import { z } from "zod"

const TourCategoryRef = z.object({
  name: z.string(),
})

const DestinationRef = z.object({
  name: z.string(),
})

const MeiliThumbnail = z.object({
  large: z.string().optional(),
  medium: z.string().optional(),
})

const TourData = z.object({
  destination: z.string(),
  description: z.record(z.unknown()),
  duration_days: z.number().int().min(1),
  max_capacity: z.number().int().min(1).optional().default(20),
  thumbnail: z.string(),
  completeThumbnail: MeiliThumbnail.optional(),
  price: z.number(),
  categories: z.array(TourCategoryRef),
  destinos: DestinationRef,
  difficulty: z.string(),
})

export const TourPublishedV1Schema = z.object({
  id: z.number(),
  slug: z.string(),
  data: TourData,
})

export const TourUpdatedV1Schema = TourPublishedV1Schema

export const TourDeletedV1Schema = z.object({
  id: z.number(),
  slug: z.string().optional(),
})

export const NormalizedTourPublishedSchema = z.object({
  id: z.number(),
  slug: z.string(),
  destination: z.string(),
  description: z.record(z.unknown()),
  duration_days: z.number().int().min(1),
  max_capacity: z.number().int().min(1).optional().default(20),
  thumbnail: z.string(),
  price: z.number(),
  categories: z.array(z.string()),
  destinos: z.string(),
  difficulty: z.string(),
})

export type NormalizedTourPublishedPayload = z.infer<typeof NormalizedTourPublishedSchema>
