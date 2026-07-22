import {
  createWorkflow,
  transform,
  when,
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
  booking_min_days_ahead?: number
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
  function (input: UpdatePackageWorkflowInput) {
    // Step 1: Get current package (for product_id link)
    const { data: packages } = useQueryGraphStep({
      entity: "package",
      fields: ["id", "product_id"],
      filters: { id: input.id }
    })

    const pkg = transform({ packages }, function (data: any) {
      return data.packages[0]
    })

    // Step 2+3: Build the full update data object in a single transform.
    // CRITICAL: cannot spread a transform proxy into an object literal — the SDK's
    // __type/__resolver keys contaminate the literal and cause all other fields to be
    // ignored. Building the entire object inside one transform avoids this.
    // Undefined fields are stripped by the SDK's parseStringifyIfNecessary, so only
    // fields actually provided in the input reach MikroORM (preserving partial updates).
    const packageUpdateData = transform({ input }, function (data: any) {
      const i = data.input
      return {
        slug: i.slug,
        destination: i.destination,
        description: i.description,
        duration_days: i.duration_days,
        max_capacity: i.max_capacity,
        thumbnail: i.thumbnail,
        is_special: i.is_special,
        booking_min_days_ahead: i.booking_min_days_ahead,
        blocked_dates: i.blocked_dates,
        blocked_week_days: i.blocked_week_days,
        cancellation_deadline_hours: i.cancellation_deadline_hours,
      }
    })

    updatePackageStep({
      id: input.id,
      data: packageUpdateData
    })

    // Step 4: Sync Medusa product (title/description) if destination/description changed.
    // updateProductsWorkflow is a no-op when the products array is empty.
    const productUpdateInput = transform(
      { input, pkg } as any,
      function (data: { input: UpdatePackageWorkflowInput; pkg: any }): any[] {
        if (!data.pkg.product_id) return []

        const updateData: any = { id: data.pkg.product_id }
        let hasUpdates = false

        if (data.input.destination) {
          const parts: string[] = [data.input.destination]
          if (data.input.duration_days) {
            parts.push(`- ${data.input.duration_days} Days`)
          }
          updateData.title = parts.join(" ")
          hasUpdates = true
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

    // Step 5: Update prices ONLY when prices are provided.
    // (Fixes the critical bug: previously ran unconditionally and zeroed all prices.)
    when(input, (data) => Boolean(data.prices))
      .then(() => {
        updatePackagePricesStep({
          packageId: input.id,
          prices: input.prices as any
        })
      })

    // Step 6: Emit internal entityPackage.updated event (for revalidate-content subscriber).
    // Emitted on every update so the storefront revalidates after any change.
    emitEventStep({
      eventName: "entityPackage.updated",
      data: { id: input.id }
    })

    // Return minimal data. The route handles presentation (retrieve with
    // relations + thumbnail) and RabbitMQ integration event publishing.
    return new WorkflowResponse({
      id: input.id,
      product_id: pkg.product_id,
    })
  }
)

export default updatePackageWorkflow
