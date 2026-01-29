import {
  createWorkflow,
  transform,
  WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import {
  updateProductsWorkflow,
  useQueryGraphStep
} from "@medusajs/medusa/core-flows"
import { updatePackageStep } from "./steps/update-package"
import { updatePackagePricesStep } from "./steps/update-package-prices"

export type UpdatePackageWorkflowInput = {
  id: string
  destination?: string
  description?: string
  duration_days?: number
  max_capacity?: number
  available_dates?: string[]
  thumbnail?: string
  prices?: {
    adult?: number
    child?: number
    infant?: number
    currency_code?: string
  }
}

export const updatePackageWorkflow = createWorkflow(
  "update-package",
  (input: UpdatePackageWorkflowInput) => {
    console.log("HELLO")

    const { data: packages } = useQueryGraphStep({
      entity: "package",
      fields: ["id", "product_id"],
      filters: { id: input.id }
    })

    const pkg = transform({ packages }, (data) => data.packages[0])

    const updatedPackage = updatePackageStep({
      id: input.id,
      data: {
        destination: input.destination,
        description: input.description,
        duration_days: input.duration_days,
        max_capacity: input.max_capacity,
        available_dates: input.available_dates,
        thumbnail: input.thumbnail
      }
    })

    const productUpdateInput = transform(
      { input, pkg },
      (data) => {
        if (!data.pkg.product_id) return []

        const updateData: any = { id: data.pkg.product_id }
        let hasUpdates = false

        if (data.input.destination || data.input.duration_days) {
          const dest = data.input.destination || "Package"
          const dur = data.input.duration_days || "X"

          if (data.input.destination) {
            updateData.title = `${data.input.destination} ${data.input.duration_days ? `- ${data.input.duration_days} Days` : ''}`
            hasUpdates = true
          }
        }

        if (data.input.description) {
          updateData.description = data.input.description
          hasUpdates = true
        }

        return hasUpdates ? [updateData] : []
      }
    )

    updateProductsWorkflow.runAsStep({
      input: {
        products: productUpdateInput
      }
    })

    updatePackagePricesStep({
      packageId: input.id,
      prices: input.prices || {}
    })

    const { data: finalPackage } = useQueryGraphStep({
      entity: "package",
      fields: [
        "id",
        "destination",
        "description",
        "duration_days",
        "max_capacity",
        "available_dates",
        "thumbnail",
        "product_id"
      ],
      filters: { id: input.id }
    }).config({ name: "retrieve-updated-package" })

    return new WorkflowResponse({
      package: finalPackage[0]
    })
  }
)

export default updatePackageWorkflow
