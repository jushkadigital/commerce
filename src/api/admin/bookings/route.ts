import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../modules/tour-booking"
import PackageModuleService from "../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../modules/package"


export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")
  const { type } = req.query

  if (type === "package") {
    return await getPackageBookings(req, res, query)
  } else {
    return await getTourBookings(req, res, query)
  }
}


async function getTourBookings(req: MedusaRequest, res: MedusaResponse, query: any) {
  const {
    data: toursBooking,
    metadata
  } = await query.graph({
    entity: "tour_booking",
    ...req.queryConfig,
  })

  console.log(toursBooking)

  res.json({
    tours_booking: toursBooking,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
    type: "tour"
  })
}


async function getPackageBookings(req: MedusaRequest, res: MedusaResponse, query: any) {
  const {
    data: packagesBooking,
    metadata
  } = await query.graph({
    entity: "package_booking",
    ...req.queryConfig,
  })

  console.log(packagesBooking)

  res.json({
    packages_booking: packagesBooking,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
    type: "package"
  })
}
