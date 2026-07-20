import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  useQueryGraphStep,
  createProductsWorkflow,
  createRemoteLinkStep
} from "@medusajs/medusa/core-flows"
import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types"
import { TOUR_MODULE } from ".."
import { PassengerType } from "../models/tour-variant"
import { validateTourStep } from "../../../workflows/steps/create-tour-validate"
import { createTourVariantsStep } from "../../../workflows/steps/create-tour-variant"
import { createToursStep } from "../../../workflows/steps/create-tour-create"
import { generateSlugStep } from "../../../workflows/steps/generate-slug"
import { buildSlugBase } from "../../../utils/slug"

/**
 * Workflow for creating a tour from a CMS event.
 *
 * This is a SEPARATE workflow from `createTourWorkflow` because it includes `cms_id`
 * as a first-class input field. The Medusa WorkflowData proxy registers input fields
 * at workflow composition time — a brand-new workflow name ("create-tour-from-cms")
 * gets a fresh proxy registration that recognizes `cms_id` from the start.
 *
 * The `cms_id` is used to build a deterministic, unique product handle:
 *   `{destination}-{duration}-days-{cms_id}`
 * This eliminates race conditions between concurrent CMS events that have the same
 * destination+duration but different ids.
 */
export type CreateTourFromCmsWorkflowInput = {
  destination: string
  description?: string
  duration_days: number
  max_capacity: number
  thumbnail?: string
  cms_id: number
  prices: {
    adult: number
    child: number
    infant: number
    currency_code?: string
  }
}

export const createTourFromCmsWorkflow = createWorkflow(
  "create-tour-from-cms",
  (input: CreateTourFromCmsWorkflowInput) => {

    validateTourStep({
      destination: input.destination,
      duration_days: input.duration_days
    })

    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["id", "default_sales_channel_id"],
    })

    // Build a deterministic unique slug using cms_id — no race condition possible
    const slug = transform(
      { destination: input.destination, duration_days: input.duration_days, cms_id: input.cms_id },
      (data) => {
        console.info(`[create-tour-from-cms] transform slug: destination=${data.destination} cms_id=${data.cms_id}`)
        const base = buildSlugBase({
          destination: data.destination,
          durationDays: data.duration_days,
        })
        return `${base}-${data.cms_id}`
      }
    )

    const productData = transform({
      input,
      stores,
      slug,
    }, (data) => {
      const currency = (data.input.prices.currency_code || "pen").toLowerCase()
      const usdRate = 0.27
      const skuPrefix = data.input.destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")

      const product: CreateProductWorkflowInputDTO = {
        title: `${data.input.destination} - ${data.input.duration_days} Days`,
        handle: data.slug,
        description: data.input.description,
        status: ProductStatus.PUBLISHED,
        thumbnail: data.input.thumbnail,
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

    const tourData = transform({ medusaProduct, input, slug }, (data) => {
      return {
        tours: [{
          product_id: data.medusaProduct[0].id,
          slug: data.slug,
          destination: data.input.destination,
          description: data.input.description,
          duration_days: data.input.duration_days,
          max_capacity: data.input.max_capacity,
          thumbnail: data.input.thumbnail
        }]
      }
    })

    const { tours } = createToursStep(tourData)

    const tourVariantsData = transform({ medusaProduct, tours }, (data) => {
      const variants = data.medusaProduct[0].variants
      const createdTour = data.tours[0]

      return {
        variants: variants.map((v: any) => {
          const typeOption = v.options.find((o: any) => o.option?.title === "Passenger Type")
          let pType = PassengerType.ADULT

          if (typeOption?.value === "Child") pType = PassengerType.CHILD
          if (typeOption?.value === "Infant") pType = PassengerType.INFANT

          return {
            tour_id: createdTour.id,
            variant_id: v.id,
            passenger_type: pType
          }
        })
      }
    })

    const { tour_variants } = createTourVariantsStep(tourVariantsData)

    const linksData = transform({ medusaProduct, tours, tour_variants }, (data) => {
      const tourLink = {
        [TOUR_MODULE]: { tour_id: data.tours[0].id },
        [Modules.PRODUCT]: { product_id: data.medusaProduct[0].id }
      }

      const variantLinks = data.tour_variants.map((tv) => ({
        [TOUR_MODULE]: { tour_variant_id: tv.id },
        [Modules.PRODUCT]: { product_variant_id: tv.variant_id }
      }))

      return [tourLink, ...variantLinks]
    })

    createRemoteLinkStep(linksData)

    const { data: finalTour } = useQueryGraphStep({
      entity: "tour",
      fields: [
        "id",
        "destination",
        "product.*",
        "variants.*",
        "variants.product_variant.*"
      ],
      filters: {
        id: tours[0].id
      }
    }).config({ name: "retrieve-tour-result-from-cms" })

    return new WorkflowResponse({
      tour: finalTour[0],
    })
  }
)

export default createTourFromCmsWorkflow
