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
import { TOUR_MODULE } from "../modules/tour-booking"
import TourModuleService from "../modules/tour-booking/service"
import { PassengerType } from "../modules/tour-booking/models/tour-variant"
import { validateTourStep } from "./steps/create-tour-validate"
import { createTourVariantsStep } from "./steps/create-tour-variant"
import { createToursStep } from "./steps/create-tour-create"



export type CreateTourWorkflowInput = {
  destination: string
  description?: string
  duration_days: number
  max_capacity: number
  available_dates: string[]
  thumbnail?: string
  prices: {
    adult: number
    child: number
    infant: number
    currency_code?: string
  }
}

export const createTourWorkflow = createWorkflow(
  "create-tour",
  (input: CreateTourWorkflowInput) => {

    // --- Step 1: Validate tour inputs (Adaptado de validateVenueAvailability) ---
    validateTourStep({
      destination: input.destination,
      available_dates: input.available_dates,
      duration_days: input.duration_days
    })

    // --- Step 2: Retrieve store (Standard) ---
    // Obtenemos el Store para asignar canales de venta por defecto
    const { data: stores } = useQueryGraphStep({
      entity: "store",
      fields: ["id", "default_sales_channel_id"],
    })

    // --- Step 3: Prepare product data using transform ---
    const productData = transform({
      input,
      stores
    }, (data) => {
      const currency = data.input.prices.currency_code || "PEN"
      const usdRate = 0.27
      // Generamos SKU basado en destino
      const skuPrefix = data.input.destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")

      const product: CreateProductWorkflowInputDTO = {
        title: `${data.input.destination} - ${data.input.duration_days} Days`,
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
            manage_inventory: false, // Mantenemos false según tu lógica de Tours
            options: { "Passenger Type": "Adult" },
            prices: [
              { amount: data.input.prices.adult, currency_code: currency },
              { amount: Math.round(data.input.prices.adult * usdRate), currency_code: "USD" }
            ]
          },
          {
            title: "Child",
            sku: `${skuPrefix}-CHILD`,
            manage_inventory: false,
            options: { "Passenger Type": "Child" },
            prices: [
              { amount: data.input.prices.child, currency_code: currency },
              { amount: Math.round(data.input.prices.child * usdRate), currency_code: "USD" }
            ]
          },
          {
            title: "Infant",
            sku: `${skuPrefix}-INFANT`,
            manage_inventory: false,
            options: { "Passenger Type": "Infant" },
            prices: [
              { amount: data.input.prices.infant, currency_code: currency },
              { amount: Math.round(data.input.prices.infant * usdRate), currency_code: "USD" }
            ]
          }
        ]
      }

      // Asignar Sales Channel por defecto
      if (data.stores[0].default_sales_channel_id) {
        product.sales_channels = [{ id: data.stores[0].default_sales_channel_id }]
      }

      return [product]
    })

    // --- Step 4: Create Medusa product ---
    const medusaProduct = createProductsWorkflow.runAsStep({
      input: { products: productData }
    })

    // --- Step 5: Prepare Tour Module Data ---
    const tourData = transform({ medusaProduct, input }, (data) => {
      return {
        tours: [{
          product_id: data.medusaProduct[0].id, // Enlace simple por ID
          destination: data.input.destination,
          description: data.input.description,
          duration_days: data.input.duration_days,
          max_capacity: data.input.max_capacity,
          available_dates: data.input.available_dates,
          thumbnail: data.input.thumbnail
        }]
      }
    })

    // --- Step 6: Create Tour Record (Module Service) ---
    const { tours } = createToursStep(tourData)

    // --- Step 7: Prepare Tour Variants Data ---
    const tourVariantsData = transform({ medusaProduct, tours }, (data) => {
      const variants = data.medusaProduct[0].variants
      const createdTour = data.tours[0]

      // Mapeamos los variantes creados por Medusa a nuestros tipos
      return {
        variants: variants.map((v: any) => {
          // Buscamos el tipo de pasajero en las opciones del variante
          const typeOption = v.options.find((o: any) => o.option?.title === "Passenger Type")
          let pType = PassengerType.ADULT

          if (typeOption?.value === "Child") pType = PassengerType.CHILD
          if (typeOption?.value === "Infant") pType = PassengerType.INFANT

          return {
            tour_id: createdTour.id,
            variant_id: v.id, // ID del ProductVariant de Medusa
            passenger_type: pType
          }
        })
      }
    })

    // --- Step 8: Create Tour Variants (Module Service) ---
    const { tour_variants } = createTourVariantsStep(tourVariantsData)

    // --- Step 9: Create Remote Links (CRITICO: Lo que faltaba en tu ejemplo) ---
    const linksData = transform({ medusaProduct, tours, tour_variants }, (data) => {
      // 1. Link Tour (Module) <-> Product (Medusa)
      const tourLink = {
        [TOUR_MODULE]: { tour_id: data.tours[0].id },
        [Modules.PRODUCT]: { product_id: data.medusaProduct[0].id }
      }

      // 2. Link TourVariant (Module) <-> ProductVariant (Medusa)
      const variantLinks = data.tour_variants.map((tv) => ({
        [TOUR_MODULE]: { tour_variant_id: tv.id },
        [Modules.PRODUCT]: { product_variant_id: tv.variant_id } // variant_id guardado en el paso anterior
      }))

      return [tourLink, ...variantLinks]
    })

    createRemoteLinkStep(linksData)

    // --- Step 10: Retrieve Final Graph ---
    const { data: finalTour } = useQueryGraphStep({
      entity: "tour", // Asegúrate de que este nombre coincida con tu definición en medusa-config o link definition
      fields: [
        "id",
        "destination",
        "product.*", // Obtenemos datos del producto linkeado
        "variants.*", // Obtenemos los tour variants
        "variants.product_variant.*" // Y sus contrapartes de producto
      ],
      filters: {
        id: tours[0].id
      }
    }).config({ name: "retrieve-tour-result" })

    return new WorkflowResponse({
      tour: finalTour[0],
    })
  }
)



/**
 * Step 3: Create TourVariants linking tour to product variants
 */

/**
 * Main workflow: Create Tour with Product and Variants
 */

export default createTourWorkflow
