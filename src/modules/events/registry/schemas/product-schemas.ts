import { z } from "zod"

export const ProductVariantPriceV1Schema = z.object({
  id: z.string().optional(),
  amount: z.number(),
  currency_code: z.string(),
})

export const ProductVariantV1Schema = z.object({
  id: z.string(),
  title: z.string().optional(),
  sku: z.string().optional(),
  prices: z.array(ProductVariantPriceV1Schema).optional(),
})

export const ProductImageV1Schema = z.object({
  url: z.string(),
})

export const ProductCategoryV1Schema = z.object({
  id: z.string(),
  name: z.string().optional(),
})

export const ProductSyncedV1Schema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  description: z.string().optional(),
  handle: z.string().optional(),
  thumbnail: z.string().optional(),
  variants: z.array(ProductVariantV1Schema).optional(),
  images: z.array(ProductImageV1Schema).optional(),
  categories: z.array(ProductCategoryV1Schema).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const ProductUpdatedV1Schema = ProductSyncedV1Schema.partial().required({ id: true })
