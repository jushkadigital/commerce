import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import PackageModuleService from "../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../modules/package"
import createPackageWorkflow from "../../../workflows/create-package"
import { StoreCreatePackageBodyType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const {
    data: packages,
    metadata,
  } = await query.graph({
    entity: "package",
    ...req.queryConfig,
  })

  res.json({
    packages,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}

export async function POST(
  req: MedusaRequest<StoreCreatePackageBodyType>,
  res: MedusaResponse
) {
  const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)

  const {
    destination,
    description,
    duration_days,
    max_capacity,
    available_dates,
    thumbnail,
    prices,
  } = req.validatedBody

  const { result } = await createPackageWorkflow(req.scope).run({
    input: {
      destination,
      description,
      duration_days,
      max_capacity,
      available_dates,
      thumbnail,
      prices,
    },
  })

  const createdPackage = await packageModuleService.retrievePackage(result.package.id, {
    relations: ["variants"],
  })
  const pricing = await packageModuleService.getPackagePricing(result.package.id)

  res.status(201).json({
    package: {
      id: createdPackage.id,
      destination: createdPackage.destination,
      description: createdPackage.description,
      duration_days: createdPackage.duration_days,
      max_capacity: createdPackage.max_capacity,
      available_dates: createdPackage.available_dates,
      prices: pricing.prices,
    },
  })
}
