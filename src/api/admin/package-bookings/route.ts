import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import PackageModuleService from "../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../modules/package"


export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

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
  })
}
