import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PackageModuleService from "../../modules/package/service"
import { PACKAGE_MODULE } from "../../modules/package"

export type ValidatePackageBookingStepInput = {
  cart_id: string
}

export const validatePackageBookingStep = createStep(
  "validate-package-booking",
  async (input: ValidatePackageBookingStepInput, { container }) => {
    const packageService: PackageModuleService = container.resolve(PACKAGE_MODULE)
    const query = container.resolve("query")

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "items.metadata", "items.quantity"],
      filters: { id: input.cart_id },
    })
    
const cart = carts[0]

    if (!cart) {
      throw new Error(`Cart ${input.cart_id} not found`)
    }

    const packageItems = cart.items?.filter(
      (item: any) => item.metadata?.is_package === true
    ) || []
    
    for (const item of packageItems) {
      if (!item) continue
      const metadata = item.metadata as {
        package_id?: string
        package_date?: string
        total_passengers?: number
      }
      
      const packageId = metadata?.package_id
      const packageDateStr = metadata?.package_date
const totalPassengers = metadata?.total_passengers ?? 0

    if (!packageId) {
        throw new Error("Package ID is required for package bookings")
      }

      if (!packageDateStr) {
        throw new Error("Package date is required for package bookings")
      }

      if (totalPassengers <= 0) {
        throw new Error("Total passengers must be greater than 0 for package bookings")
      }

      const packageDate = new Date(packageDateStr)

      const validation = await packageService.validateBooking(
        packageId,
        packageDate,
        totalPassengers
      )

      if (!validation.valid) {
        throw new Error(validation.reason || "Package booking validation failed")
      }
    }

    return new StepResponse({ validated: true })
  }
)
