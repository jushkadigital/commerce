import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import PackageModuleService from "../../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../../modules/package"
import { z } from "zod"
import updatePackageWorkflow from "../../../../workflows/update-package"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const pkg = await packageModuleService.retrievePackage(id, {
    relations: ["variants", "bookings"],
  })

  let thumbnail: string | null = null
  if (pkg.product_id) {
    try {
      const product = await productModule.retrieveProduct(pkg.product_id)
      thumbnail = product.thumbnail || null
    } catch (error) {
      console.warn(`Could not fetch product ${pkg.product_id}:`, error)
    }
  }

  res.json({ package: { ...pkg, thumbnail } })
}

const UpdatePackageSchema = z.object({
  destination: z.string().optional(),
  description: z.string().optional(),
  duration_days: z.coerce.number().optional(),
  max_capacity: z.coerce.number().optional(),
  available_dates: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  prices: z.object({
    adult: z.coerce.number().optional(),
    child: z.coerce.number().optional(),
    infant: z.coerce.number().optional(),
    currency_code: z.string().optional(),
  }).optional(),
})

type UpdatePackageSchemaType = z.infer<typeof UpdatePackageSchema>

export const POST = async (
  req: MedusaRequest<UpdatePackageSchemaType>,
  res: MedusaResponse
) => {
  const { id } = req.params

  console.log(req.params)
  const validatedBody = UpdatePackageSchema.parse(req.body)

  const { result, errors } = await updatePackageWorkflow(req.scope).run({
    input: {
      id,
      ...validatedBody,
    },
    throwOnError: false,
  })

  if (errors.length > 0) {
    res.status(500).json({
      message: "Failed to update package",
      errors: errors.map((e) => e.error.message),
    })
    return
  }

  res.json({ package: result.package })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)
    const productModule = req.scope.resolve(Modules.PRODUCT)

    const pkg = await packageModuleService.retrievePackage(id, {
      relations: ["variants", "bookings"],
    }).catch(() => null)

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" })
    }

    if (pkg.variants && pkg.variants.length > 0) {
      const variantIds = pkg.variants.map((v: any) => v.id)
      console.log(`Deleting ${variantIds.length} variants for package ${id}`)
      try {
        await packageModuleService.deletePackageVariants(variantIds)
      } catch (variantError) {
        console.warn("Could not delete variants:", variantError)
      }
    }

    if (pkg.bookings && pkg.bookings.length > 0) {
      const bookingIds = pkg.bookings.map((b: any) => b.id)
      console.log(`Deleting ${bookingIds.length} bookings for package ${id}`)
      try {
        await packageModuleService.deletePackageBookings(bookingIds)
      } catch (bookingError) {
        console.warn("Could not delete bookings:", bookingError)
      }
    }

    await packageModuleService.deletePackages(id)
    console.log(`Deleted package ${id}`)

    if (pkg.product_id) {
      try {
        await productModule.deleteProducts([pkg.product_id])
        console.log(`Deleted associated product ${pkg.product_id}`)
      } catch (productError) {
        console.warn(`Could not delete product ${pkg.product_id}:`, productError)
      }
    }

    res.json({ id, deleted: true })
  } catch (error: any) {
    console.error("Error deleting package:", error)
    res.status(500).json({
      message: "Failed to delete package",
      error: error.message,
    })
  }
}
