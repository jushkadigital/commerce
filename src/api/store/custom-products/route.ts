import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  isPresent,
  QueryContext,
} from "@medusajs/framework/utils"
import {
  wrapVariantsWithInventoryQuantityForSalesChannel,
} from "@medusajs/medusa/api/utils/middlewares/index"
import {
  wrapProductsWithTaxPrices,
} from "@medusajs/medusa/api/store/products/helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const context: Record<string, any> = {}

  const withInventoryQuantity = req.queryConfig.fields.some((field: string) =>
    field.includes("variants.inventory_quantity")
  )

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field: string) => !field.includes("variants.inventory_quantity")
    )
  }

  if (isPresent((req as any).pricingContext)) {
    context["variants"] ??= {}
    context["variants"]["calculated_price"] ??= QueryContext(
      (req as any).pricingContext
    )
  }

  const { data: products = [], metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
    context,
  })

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req as any,
      (products as any[]).map((product: any) => product.variants).flat(1)
    )
  }

  await wrapProductsWithTaxPrices(req as any, products as any)

  res.json({
    products,
    count: (metadata as any)?.count,
    offset: (metadata as any)?.skip,
    limit: (metadata as any)?.take,
  })
}
