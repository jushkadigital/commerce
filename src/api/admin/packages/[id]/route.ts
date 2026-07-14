import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import PackageModuleService from "../../../../modules/package/service"
import { PACKAGE_MODULE } from "../../../../modules/package"
import { z } from "@medusajs/framework/zod"

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
      // Product fetch failed - non-critical error
    }
  }

  res.json({ package: { ...pkg, thumbnail } })
}

const UpdatePackageSchema = z.object({
  destination: z.string().optional(),
  description: z.string().optional(),
  duration_days: z.coerce.number().optional(),
  is_special: z.boolean().optional(),
  max_capacity: z.coerce.number().optional(),
  booking_min_days_ahead: z.coerce.number().int().nonnegative().optional(),
  thumbnail: z.string().optional(),
  prices: z.object({
    adult: z.coerce.number().optional(),
    child: z.coerce.number().optional(),
    infant: z.coerce.number().optional(),
    currency_code: z.string().optional(),
  }).optional(),
  blocked_dates: z.array(z.string()).optional(),
  blocked_week_days: z.array(z.string()).optional(),
  cancellation_deadline_hours: z.coerce.number().int().nonnegative().optional(),
})

type UpdatePackageSchemaType = z.infer<typeof UpdatePackageSchema>

export const POST = async (
  req: MedusaRequest<UpdatePackageSchemaType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const packageModuleService: PackageModuleService = req.scope.resolve(PACKAGE_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const validatedBody = UpdatePackageSchema.parse(req.body)
  const updateData: Record<string, unknown> = {}

  if ("slug" in validatedBody) updateData.slug = validatedBody.slug
  if ("destination" in validatedBody) updateData.destination = validatedBody.destination
  if ("description" in validatedBody) updateData.description = validatedBody.description
  if ("duration_days" in validatedBody) updateData.duration_days = validatedBody.duration_days
  if ("max_capacity" in validatedBody) updateData.max_capacity = validatedBody.max_capacity
  if ("thumbnail" in validatedBody) updateData.thumbnail = validatedBody.thumbnail
  if ("is_special" in validatedBody) updateData.is_special = validatedBody.is_special
  if ("booking_min_days_ahead" in validatedBody) updateData.booking_min_days_ahead = validatedBody.booking_min_days_ahead
  if ("blocked_dates" in validatedBody) updateData.blocked_dates = validatedBody.blocked_dates
  if ("blocked_week_days" in validatedBody) updateData.blocked_week_days = validatedBody.blocked_week_days
  if ("cancellation_deadline_hours" in validatedBody) updateData.cancellation_deadline_hours = validatedBody.cancellation_deadline_hours

  try {
    await packageModuleService.updatePackages([{ id, ...updateData }])

    const currentPackage = await packageModuleService.retrievePackage(id)

    if (validatedBody.prices) {
      await packageModuleService.updateVariantPrices(id, validatedBody.prices, req.scope)

      const eventBus = req.scope.resolve(Modules.EVENT_BUS)
      await eventBus.emit([
        {
          name: "entityPackage.updated",
          data: { id },
        },
        ...(currentPackage.product_id ? [{
          name: "product.updated",
          data: { id: currentPackage.product_id },
        }] : []),
      ])
    }

    let thumbnail: string | null = null
    if (currentPackage.product_id) {
      try {
        const product = await productModule.retrieveProduct(currentPackage.product_id)
        thumbnail = product.thumbnail || null
      } catch (error) {
        // Product fetch failed - non-critical error
      }
    }

    res.json({ package: { ...currentPackage, thumbnail } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    console.error("Failed to update package", error)
    res.status(500).json({
      message: "Failed to update package",
      errors: [message],
    })
  }
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
      try {
        await packageModuleService.deletePackageVariants(variantIds)
      } catch (variantError) {
        // Variant deletion failed - non-critical
      }
    }

    if (pkg.bookings && pkg.bookings.length > 0) {
      const bookingIds = pkg.bookings.map((b: any) => b.id)
      try {
        await packageModuleService.deletePackageBookings(bookingIds)
      } catch (bookingError) {
        // Booking deletion failed - non-critical
      }
    }

    await packageModuleService.deletePackages(id)

    if (pkg.product_id) {
      try {
        await productModule.deleteProducts([pkg.product_id])
      } catch (productError) {
        // Product deletion failed - non-critical
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