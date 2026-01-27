import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

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

  console.log("\n=== Configurando Store ===\n")

  // 1. Obtener o crear el store
  const [store] = await storeModule.listStores({})

  if (!store) {
    console.log("No hay store configurado. Creando...")
    const newStore = await storeModule.createStores({
      name: "Mi Tienda de Tours",
      supported_currencies: [
        { currency_code: "pen", is_default: true },
        { currency_code: "usd", is_default: false },
      ],
    })
    console.log("Store creado:", newStore.id)
  } else {
    console.log("Store existente:", store.id)
    console.log("Actualizando monedas soportadas...")

    await storeModule.updateStores(store.id, {
      supported_currencies: [
        { currency_code: "pen", is_default: true },
        { currency_code: "usd", is_default: false },
      ],
    })
    console.log("Monedas actualizadas: PEN (default), USD")
  }

  // 2. Crear o verificar Sales Channel
  let salesChannels = await salesChannelModule.listSalesChannels({})
  let salesChannel = salesChannels.find((sc: any) => sc.name === "Storefront") || salesChannels[0]

  if (!salesChannel) {
    console.log("\nCreando Sales Channel 'Storefront'...")
    salesChannel = await salesChannelModule.createSalesChannels({
      name: "Storefront",
      description: "Canal de ventas principal para tours",
      is_disabled: false,
    })
    console.log("Sales Channel creado:", salesChannel.id)
  } else {
    console.log("\nSales Channel existente:", salesChannel.name, "-", salesChannel.id)
  }

  // 3. Crear Publishable API Key si no existe
  console.log("\n=== Publishable API Keys ===")
  const apiKeys = await apiKeyModule.listApiKeys({ type: "publishable" })

  let publishableKey = apiKeys.find((k: any) => k.title === "Storefront Key")

  if (!publishableKey && apiKeys.length === 0) {
    console.log("Creando Publishable API Key...")
    publishableKey = await apiKeyModule.createApiKeys({
      title: "Storefront Key",
      type: "publishable",
      created_by: "system",
    })
    console.log("API Key creada:", publishableKey.id)
    console.log("Token:", publishableKey.token)
  } else {
    publishableKey = publishableKey || apiKeys[0]
    console.log("API Key existente:", publishableKey.title)
    console.log("Token:", publishableKey.token)
  }

  // 4. Crear Region para Perú con PEN
  console.log("\n=== Regiones ===")
  let regions = await regionModule.listRegions({})
  let regionPeru = regions.find((r: any) => r.name === "Perú")

  if (!regionPeru) {
    console.log("Creando Region 'Perú' con PEN...")
    regionPeru = await regionModule.createRegions({
      name: "Perú",
      currency_code: "pen",
      countries: ["pe"],
      payment_providers: ["Izipay"]
    })
    console.log("Region Perú creada:", regionPeru.id)
  } else {
    console.log("Region Perú existente:", regionPeru.id)
  }

  // 5. Crear Region Internacional con USD
  let regionIntl = regions.find((r: any) => r.name === "Internacional")

  if (!regionIntl) {
    console.log("Creando Region 'Internacional' con USD...")
    regionIntl = await regionModule.createRegions({
      name: "Internacional",
      currency_code: "usd",
      countries: ["us", "co", "ec", "cl", "ar", "mx", "br"],
    })
    console.log("Region Internacional creada:", regionIntl.id)
  } else {
    console.log("Region Internacional existente:", regionIntl.id)
  }

  console.log("\n" + "=".repeat(50))
  console.log("=== CONFIGURACIÓN COMPLETADA ===")
  console.log("=".repeat(50))
  console.log("\nMonedas: PEN (default), USD")
  console.log("Sales Channel:", salesChannel.name, "-", salesChannel.id)
  console.log("Publishable API Key:", publishableKey.token)
  console.log("Regiones: Perú (PEN), Internacional (USD)")
  console.log("\nPara pagos, usa tu endpoint custom: POST /store/izipay/create-payment")
  console.log("\n" + "=".repeat(50))
}
