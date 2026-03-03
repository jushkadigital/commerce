import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"



export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")


  const filtersSource = {
    ...(req.filterableFields || {}),
  } as Record<string, any>

  const package_date = filtersSource.package_date as
    | { gte?: string; lte?: string }
    | undefined

  delete filtersSource.package_date
  delete filtersSource.type

  const filters: Record<string, any> = { ...filtersSource }


  if (package_date) {
    filters.package_date = {}
    if (package_date.gte) {
      filters.package_date.$gte = package_date.gte
    }
    if (package_date.lte) {
      filters.package_date.$lte = package_date.lte
    }
  }

  const {
    data: packagesBooking,
    metadata
  } = await query.graph({
    entity: "package_booking",
    ...req.queryConfig,
    filters,
  })

  res.json({
    packages_booking: packagesBooking,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}
