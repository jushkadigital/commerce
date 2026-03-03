import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"



export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")


  const filtersSource = {
    ...(req.filterableFields || {}),
  } as Record<string, any>

  const tour_date = filtersSource.tour_date as
    | { gte?: string; lte?: string }
    | undefined

  delete filtersSource.tour_date
  delete filtersSource.type

  const filters: Record<string, any> = { ...filtersSource }


  if (tour_date) {
    filters.tour_date = {}
    if (tour_date.gte) {
      filters.tour_date.$gte = tour_date.gte
    }
    if (tour_date.lte) {
      filters.tour_date.$lte = tour_date.lte
    }
  }

  const {
    data: toursBooking,
    metadata
  } = await query.graph({
    entity: "tour_booking",
    ...req.queryConfig,
    filters,
  })

  res.json({
    tours_booking: toursBooking,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
    type: "tour"
  })
}
