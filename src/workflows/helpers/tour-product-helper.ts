import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { PassengerType } from "../../modules/tour-booking/models/tour-variant"

interface TourProductData {
  destination: string
  description?: string
  duration_days: number
  thumbnail?: string
  prices: {
    adult: number
    child: number
    infant: number
    currency_code?: string
  }
}

interface ProductVariantMapping {
  variantId: string
  passengerType: PassengerType
}

/**
 * Create a Medusa product for a tour with passenger type variants
 */
export async function createTourProductWithVariants(
  container: any,
  tourData: TourProductData
): Promise<{ productId: string; variants: ProductVariantMapping[] }> {
  const currency = tourData.prices.currency_code || "PEN"
  const usdRate = 0.27 // Approximate PEN to USD conversion

  // DEBUG: Log incoming prices
  console.log(`[CREATE PRODUCT DEBUG] Received prices:`, JSON.stringify(tourData.prices))
  console.log(`[CREATE PRODUCT DEBUG] Adult: ${tourData.prices.adult} (stored as major units, not cents)`)

  // Generate SKU prefix from destination
  const skuPrefix = tourData.destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  // NOTE: Medusa v2 stores prices in MAJOR UNITS (dollars/soles), NOT cents
  // So $300 is stored as 300, not 30000
  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: `${tourData.destination} - ${tourData.duration_days} Day Tour`,
          subtitle: tourData.description,
          description: tourData.description,
          thumbnail: tourData.thumbnail,
          status: ProductStatus.PUBLISHED,
          options: [
            {
              title: "Passenger Type",
              values: ["Adult", "Child", "Infant"],
            },
          ],
          variants: [
            {
              title: "Adult",
              sku: `${skuPrefix}-ADULT`,
              manage_inventory: false,
              options: {
                "Passenger Type": "Adult",
              },
              prices: [
                {
                  amount: tourData.prices.adult,
                  currency_code: currency,
                },
                {
                  amount: Math.round(tourData.prices.adult * usdRate),
                  currency_code: "USD",
                },
              ],
            },
            {
              title: "Child",
              sku: `${skuPrefix}-CHILD`,
              manage_inventory: false,
              options: {
                "Passenger Type": "Child",
              },
              prices: [
                {
                  amount: tourData.prices.child,
                  currency_code: currency,
                },
                {
                  amount: Math.round(tourData.prices.child * usdRate),
                  currency_code: "USD",
                },
              ],
            },
            {
              title: "Infant",
              sku: `${skuPrefix}-INFANT`,
              manage_inventory: false,
              options: {
                "Passenger Type": "Infant",
              },
              prices: [
                {
                  amount: tourData.prices.infant,
                  currency_code: currency,
                },
                {
                  amount: Math.round(tourData.prices.infant * usdRate),
                  currency_code: "USD",
                },
              ],
            },
          ],
        },
      ],
    },
  })

  const product = products[0]

  console.log("Created product from workflow:", JSON.stringify(product, null, 2))

  // Fetch the product with variants to get real IDs
  const productModule = container.resolve(Modules.PRODUCT)
  const productWithVariants = await productModule.retrieveProduct(product.id, {
    relations: ["variants"],
  })

  console.log("Retrieved product with variants:", JSON.stringify(productWithVariants, null, 2))

  // Verify variants exist
  if (!productWithVariants.variants || productWithVariants.variants.length < 3) {
    throw new Error(
      `Product created but variants missing. Expected 3 variants, got ${productWithVariants.variants?.length || 0}`
    )
  }

  // Map variants by SKU to ensure correct order
  const variantBySku = new Map()
  for (const variant of productWithVariants.variants) {
    variantBySku.set(variant.sku, variant)
  }

  const variantMapping: ProductVariantMapping[] = [
    {
      variantId: variantBySku.get(`${skuPrefix}-ADULT`)?.id,
      passengerType: PassengerType.ADULT,
    },
    {
      variantId: variantBySku.get(`${skuPrefix}-CHILD`)?.id,
      passengerType: PassengerType.CHILD,
    },
    {
      variantId: variantBySku.get(`${skuPrefix}-INFANT`)?.id,
      passengerType: PassengerType.INFANT,
    },
  ]

  console.log("Variant mapping with real IDs:", JSON.stringify(variantMapping, null, 2))

  return {
    productId: product.id,
    variants: variantMapping,
  }
}

/**
 * Update product variant prices using the Pricing Module
 * IMPORTANT: prices.adult/child/infant should be in display format (e.g., 100 for S/100.00)
 * This function will convert to cents (multiply by 100) before storing
 */
export async function updateTourProductPrices(
  container: any,
  variantIds: string[],
  prices: {
    adult?: number
    child?: number
    infant?: number
    currency_code?: string
  }
): Promise<void> {
  const { ContainerRegistrationKeys } = await import("@medusajs/framework/utils")
  const pricingModule = container.resolve(Modules.PRICING)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const currency = prices.currency_code || "PEN"
  const usdRate = 0.27

  const priceValues = [
    prices.adult || 0,
    prices.child || 0,
    prices.infant || 0,
  ]

  // Query variants with their price sets using Remote Query (correct approach)
  const { data: variantsWithPriceSets } = await query.graph({
    entity: "product_variant",
    fields: ["id", "price_set.id"],
    filters: {
      id: variantIds,
    },
  })

  // Build a map of variant_id to price_set_id
  const variantToPriceSetMap = new Map<string, string>()
  for (const variantData of variantsWithPriceSets || []) {
    if (variantData.price_set?.id) {
      variantToPriceSetMap.set(variantData.id, variantData.price_set.id)
    }
  }

  for (let i = 0; i < variantIds.length; i++) {
    const variantId = variantIds[i]
    const priceValue = priceValues[i]
    const priceSetId = variantToPriceSetMap.get(variantId)

    if (!priceSetId) {
      console.warn(`No price set found for variant ${variantId}`)
      continue
    }

    try {
      // Update the price set with new prices (in major units, not cents)
      // Medusa v2 stores prices in major units: $300 is stored as 300
      await pricingModule.updatePriceSets(priceSetId, {
        prices: [
          {
            amount: priceValue,
            currency_code: currency.toLowerCase(),
          },
          {
            amount: Math.round(priceValue * usdRate),
            currency_code: "usd",
          },
        ],
      })
    } catch (error) {
      console.error(`Error updating prices for variant ${variantId}:`, error)
      throw error
    }
  }
}

/**
 * Update product basic information
 */
export async function updateTourProduct(
  container: any,
  productId: string,
  data: {
    destination?: string
    description?: string
    duration_days?: number
  }
): Promise<void> {
  const productModule = container.resolve(Modules.PRODUCT)

  const updateData: any = {}

  if (data.destination || data.duration_days) {
    updateData.title = `${data.destination} - ${data.duration_days} Day Tour`
  }

  if (data.description) {
    updateData.subtitle = data.description
    updateData.description = data.description
  }

  if (Object.keys(updateData).length > 0) {
    await productModule.updateProducts({
      id: productId,
      ...updateData,
    })
  }
}
