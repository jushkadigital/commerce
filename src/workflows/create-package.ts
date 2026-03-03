import {
  createStep,
  createWorkflow,
  WorkflowResponse,
  StepResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  useQueryGraphStep,
  createProductsWorkflow,
  createRemoteLinkStep
} from "@medusajs/medusa/core-flows"
import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types"
import { PACKAGE_MODULE } from "../modules/package"
import PackageModuleService from "../modules/package/service"
import { PassengerType } from "../modules/package/models/package-variant"
import { validatePackageStep } from "./steps/create-package-validate"
import { createPackageVariantsStep } from "./steps/create-package-variant"
import { createPackagesStep } from "./steps/create-package-create"
import { validateBookingWindowStep } from "./steps/validate-booking-window"
import { validateCapacityStep } from "./steps/validate-capacity"
import { validateBlockedDatesStep } from "./steps/validate-blocked-dates"

export type CreatePackageWorkflowInput = {
  destination: string
  description?: string
  duration_days: number
  max_capacity: number
  thumbnail?: string
  prices: {
    adult: number
    child: number
    infant: number
    currency_code?: string
  }
  is_special?: boolean
  blocked_dates?: string[]
  blocked_week_days?: string[]
  cancellation_deadline_hours?: number
  booking_min_months_ahead?: number,
  metadata?: Record<string, any>
}

export const createPackageWorkflow = createWorkflow(
  "create-package",
  (input: CreatePackageWorkflowInput) => {
    validatePackageStep({
      destination: input.destination,
      duration_days: input.duration_days
    })

    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["id", "default_sales_channel_id"],
    })

    const productData = transform({
      input,
      stores
    }, (data) => {
      const currency = data.input.prices.currency_code || "PEN"
      const usdRate = 0.27
      const skuPrefix = data.input.destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")

      const product: CreateProductWorkflowInputDTO = {
        title: `${data.input.destination} - ${data.input.duration_days} Days`,
        description: data.input.description,
        status: ProductStatus.PUBLISHED,
        thumbnail: data.input.thumbnail,
        external_id: data.input.metadata?.payloadId,
        options: [
          {
            title: "Passenger Type",
            values: ["Adult", "Child", "Infant"]
          }
        ],
        variants: [
          {
            title: "Adult",
            sku: `${skuPrefix}-ADULT`,
            manage_inventory: false,
            options: { "Passenger Type": "Adult" },
            prices: [
              { amount: data.input.prices.adult, currency_code: currency },
              { amount: Math.round(data.input.prices.adult * usdRate), currency_code: "usd" }
            ]
          },
          {
            title: "Child",
            sku: `${skuPrefix}-CHILD`,
            manage_inventory: false,
            options: { "Passenger Type": "Child" },
            prices: [
              { amount: data.input.prices.child, currency_code: currency },
              { amount: Math.round(data.input.prices.child * usdRate), currency_code: "usd" }
            ]
          },
          {
            title: "Infant",
            sku: `${skuPrefix}-INFANT`,
            manage_inventory: false,
            options: { "Passenger Type": "Infant" },
            prices: [
              { amount: data.input.prices.infant, currency_code: currency },
              { amount: Math.round(data.input.prices.infant * usdRate), currency_code: "usd" }
            ]
          }
        ]
      }

      if (data.stores[0].default_sales_channel_id) {
        product.sales_channels = [{ id: data.stores[0].default_sales_channel_id }]
      }

      return [product]
    })

    const medusaProduct = createProductsWorkflow.runAsStep({
      input: { products: productData }
    })

    const packageData = transform({ medusaProduct, input }, (data) => {
      return {
        packages: [{
          product_id: data.medusaProduct[0].id,
          destination: data.input.destination,
          description: data.input.description,
          duration_days: data.input.duration_days,
          max_capacity: data.input.max_capacity,
          thumbnail: data.input.thumbnail,
          is_special: data.input.is_special,
          blocked_dates: data.input.blocked_dates,
          blocked_week_days: data.input.blocked_week_days,
          cancellation_deadline_hours: data.input.cancellation_deadline_hours,
          booking_min_months_ahead: data.input.booking_min_months_ahead,
          ...(data.input.metadata && { metadata: data.input.metadata })
        }]
      }
    })

    const { packages } = createPackagesStep(packageData)

    const packageVariantsData = transform({ medusaProduct, packages }, (data) => {
      const variants = data.medusaProduct[0].variants
      const createdPackage = data.packages[0]

      return {
        variants: variants.map((v: any) => {
          const typeOption = v.options.find((o: any) => o.option?.title === "Passenger Type")
          let pType = PassengerType.ADULT

          if (typeOption?.value === "Child") pType = PassengerType.CHILD
          if (typeOption?.value === "Infant") pType = PassengerType.INFANT

          return {
            package_id: createdPackage.id,
            variant_id: v.id,
            passenger_type: pType
          }
        })
      }
    })

    const { package_variants } = createPackageVariantsStep(packageVariantsData)

    const linksData = transform({ medusaProduct, packages, package_variants }, (data) => {
      const packageLink = {
        [PACKAGE_MODULE]: { package_id: data.packages[0].id },
        [Modules.PRODUCT]: { product_id: data.medusaProduct[0].id }
      }

      const variantLinks = data.package_variants.map((pv) => ({
        [PACKAGE_MODULE]: { package_variant_id: pv.id },
        [Modules.PRODUCT]: { product_variant_id: pv.variant_id }
      }))

      return [packageLink, ...variantLinks]
    })

    createRemoteLinkStep(linksData)

    const { data: finalPackage } = useQueryGraphStep({
      entity: "package",
      fields: [
        "id",
        "destination",
        "description",
        "duration_days",
        "max_capacity",
        "thumbnail",
        "product_id",
        "product.*",
        "product.variants.*",
        "variants.*",
        "variants.product_variant.*"
      ],
      filters: {
        id: packages[0].id
      }
    }).config({ name: "retrieve-package-result" })

    return new WorkflowResponse({
      package: finalPackage[0],
    })
  }
)

export default createPackageWorkflow
