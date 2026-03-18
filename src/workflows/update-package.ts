import {
  createWorkflow,
  transform,
  WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import {
  updateProductsWorkflow,
  useQueryGraphStep,
  emitEventStep
} from "@medusajs/medusa/core-flows"
import { updatePackageStep } from "./steps/update-package"
import { updatePackagePricesStep } from "./steps/update-package-prices"

export type UpdatePackageWorkflowInput = {
  id: string
  slug?: string
  destination?: string
  description?: string
  duration_days?: number
  max_capacity?: number
  thumbnail?: string
  is_special?: boolean
  booking_min_months_ahead?: number
  blocked_dates?: string[]
  blocked_week_days?: string[]
  cancellation_deadline_hours?: number
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

    const packages = useQueryGraphStep({
      entity: "package",
      fields: ["id", "product_id"],
      filters: { id: input.id }
    }).data as any

    const pkg = transform({ packages }, function (data: any) { return data.packages[0] })

    const packageSlugUpdate = transform({ input }, (data) => {
      if (!data.input.slug) {
        return {}
      }

      return { slug: data.input.slug }
    })

    updatePackageStep({
      id: input.id,
      data: {
        ...packageSlugUpdate,
        destination: input.destination,
        description: input.description,
        duration_days: input.duration_days,
        max_capacity: input.max_capacity,
        thumbnail: input.thumbnail,
        is_special: input.is_special,
        booking_min_months_ahead: input.booking_min_months_ahead,
        blocked_dates: input.blocked_dates,
        blocked_week_days: input.blocked_week_days,
        cancellation_deadline_hours: input.cancellation_deadline_hours,
      }
    })

    const productUpdateInput: any = transform(
      { input, pkg },
      function (data: any) {
        if (!data.pkg.product_id) return []

        const updateData: any = { id: data.pkg.product_id }
        let hasUpdates = false

        if (data.input.destination || data.input.duration_days) {
          if (data.input.destination) {
            const parts: string[] = [data.input.destination]
            if (data.input.duration_days) {
              parts.push(`- ${data.input.duration_days} Days`)
            }
            updateData.title = parts.join(" ")
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
        "thumbnail",
        "is_special",
        "booking_min_months_ahead",
        "blocked_dates",
        "blocked_week_days",
        "cancellation_deadline_hours",
        "product_id"
      ],
      filters: { id: input.id }
    }).config({ name: "retrieve-updated-package" })

    emitEventStep({
      eventName: "entityPackage.updated",
      data: { id: input.id }
    })

    return new WorkflowResponse({
      package: finalPackage[0]
    })
  }
)

export default updatePackageWorkflow
