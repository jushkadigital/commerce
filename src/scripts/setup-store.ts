import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

/**
 * Script para configurar la tienda con:
 * - Monedas: PEN, USD
 * - Sales Channel con Publishable API Key
 * - Regiones
 *
 * Ejecutar: npx medusa exec ./src/scripts/setup-store.ts
 */
export default async function setupStore({ container }: ExecArgs) {
  const storeModule = container.resolve(Modules.STORE)
  const regionModule = container.resolve(Modules.REGION)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const apiKeyModule = container.resolve(Modules.API_KEY)


  // 1. Obtener o crear el store
  const [store] = await storeModule.listStores({})

  if (!store) {
    const newStore = await storeModule.createStores({
      name: "Mi Tienda de Tours",
      supported_currencies: [
        { currency_code: "pen", is_default: true },
        { currency_code: "usd", is_default: false },
      ],
    })
  } else {

    await storeModule.updateStores(store.id, {
      supported_currencies: [
        { currency_code: "pen", is_default: true },
        { currency_code: "usd", is_default: false },
      ],
    })
  }

  // 2. Crear o verificar Sales Channel
  let salesChannels = await salesChannelModule.listSalesChannels({})
  let salesChannel = salesChannels.find((sc: any) => sc.name === "Storefront") || salesChannels[0]

  if (!salesChannel) {
    salesChannel = await salesChannelModule.createSalesChannels({
      name: "Storefront",
      description: "Canal de ventas principal para tours",
      is_disabled: false,
    })
  } else {
  }

  // 3. Crear Publishable API Key si no existe
  const apiKeys = await apiKeyModule.listApiKeys({ type: "publishable" })

  let publishableKey = apiKeys.find((k: any) => k.title === "Storefront Key")

  if (!publishableKey && apiKeys.length === 0) {
    publishableKey = await apiKeyModule.createApiKeys({
      title: "Storefront Key",
      type: "publishable",
      created_by: "system",
    })
  } else {
    publishableKey = publishableKey || apiKeys[0]
  }

  // 4. Crear Region para Perú con PEN
  let regions = await regionModule.listRegions({})
  let regionPeru = regions.find((r: any) => r.name === "Perú")

  if (!regionPeru) {
    regionPeru = await regionModule.createRegions({
      name: "Perú",
      currency_code: "pen",
      countries: ["pe"],
      payment_providers: ["pp_izipay_izipay"]
    })
  } else {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    try {
      await link.create({
        [Modules.REGION]: {
          region_id: regionPeru.id,
        },
        [Modules.PAYMENT]: {
          payment_provider_id: "pp_izipay_izipay",
        },
      })
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
      } else {
        console.error("Error al asignar proveedor:", error.message)
      }
    }
  }

  // 5. Crear Region Internacional con USD
  let regionIntl = regions.find((r: any) => r.name === "Internacional")

  if (!regionIntl) {
    regionIntl = await regionModule.createRegions({
      name: "Internacional",
      currency_code: "usd",
      countries: ["us", "co", "ec", "cl", "ar", "mx", "br"],
    })
  } else {
  }

}
