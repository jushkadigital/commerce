import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Script para verificar los links entre regiones y payment providers
 * Ejecutar: npx medusa exec ./src/scripts/check-region-links.ts
 */
export default async function checkRegionLinks({ container }: ExecArgs) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const regionModule = container.resolve(Modules.REGION)

  const regions = await regionModule.listRegions({})
  const peru = regions.find((r: any) => r.name === "Perú")

  if (!peru) {
    return
  }


  const links = await link.list({
    [Modules.REGION]: {
      region_id: peru.id,
    },
  })


  if (links.length === 0) {
    try {
      await link.create({
        [Modules.REGION]: {
          region_id: peru.id,
        },
        [Modules.PAYMENT]: {
          payment_provider_id: "pp_izipay_izipay",
        },
      })
    } catch (e: any) {
      console.error("❌ Error creando link:", e.message)
    }
  } else {
    links.forEach((link: any, index: number) => {
    })
  }

  const paymentLinks = await link.list({
    [Modules.PAYMENT]: {
      payment_provider_id: "pp_izipay_izipay",
    },
  })

  paymentLinks.forEach((link: any, index: number) => {
  })

}
