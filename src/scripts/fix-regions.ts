import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function fixRegions({ container }: ExecArgs) {
  const regionModule = container.resolve(Modules.REGION)


  // Obtener todas las regiones
  const regions = await regionModule.listRegions({}, {
    relations: ["countries"]
  })

  // Buscar la región mal configurada
  const badRegion = regions.find((r: any) => r.name === "USA" && r.currency_code === "eur")

  if (badRegion) {

    // Actualizar a Perú con PEN
    await regionModule.updateRegions(badRegion.id, {
      name: "Perú",
      currency_code: "pen",
    })

  }

  // Verificar si existe región para USD
  const usdRegion = regions.find((r: any) => r.currency_code === "usd")

  if (!usdRegion) {
    const newRegion = await regionModule.createRegions({
      name: "Internacional",
      currency_code: "usd",
      countries: ["us"],
    })
  } else {
  }

  // Listar regiones finales
  const finalRegions = await regionModule.listRegions({}, {
    relations: ["countries"]
  })

  for (const region of finalRegions) {
  }

}
