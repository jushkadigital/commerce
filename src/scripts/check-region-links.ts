import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Script para verificar los links entre regiones y payment providers
 * Ejecutar: npx medusa exec ./src/scripts/check-region-links.ts
 */
export default async function checkRegionLinks({ container }: ExecArgs) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const regionModule = container.resolve(Modules.REGION)

  console.log("\n=== Obteniendo región Perú ===")
  const regions = await regionModule.listRegions({})
  const peru = regions.find((r: any) => r.name === "Perú")

  if (!peru) {
    console.log("❌ No se encontró región Perú")
    return
  }

  console.log(`✅ Región Perú encontrada: ${peru.id}`)

  console.log("\n=== Verificando links para región Perú ===")
  const links = await link.list({
    [Modules.REGION]: {
      region_id: peru.id,
    },
  })

  console.log(`Total links encontrados: ${links.length}`)

  if (links.length === 0) {
    console.log("❌ No hay links asignados a esta región")
    console.log("\n=== Creando link para pp_izipay_izipay ===")
    try {
      await link.create({
        [Modules.REGION]: {
          region_id: peru.id,
        },
        [Modules.PAYMENT]: {
          payment_provider_id: "pp_izipay_izipay",
        },
      })
      console.log("✅ Link creado exitosamente")
    } catch (e: any) {
      console.error("❌ Error creando link:", e.message)
    }
  } else {
    console.log("\nLinks encontrados:")
    links.forEach((link: any, index: number) => {
      console.log(`${index + 1}. ${JSON.stringify(link, null, 2)}`)
    })
  }

  console.log("\n=== Verificando second links (lado payment) ===")
  const paymentLinks = await link.list({
    [Modules.PAYMENT]: {
      payment_provider_id: "pp_izipay_izipay",
    },
  })

  console.log(`Total links para pp_izipay_izipay: ${paymentLinks.length}`)
  paymentLinks.forEach((link: any, index: number) => {
    console.log(`${index + 1}. Region ID: ${link.region_id || 'N/A'}`)
  })

  console.log("\n" + "=".repeat(50))
}
