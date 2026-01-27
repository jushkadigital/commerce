import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function fixRegions({ container }: ExecArgs) {
  const regionModule = container.resolve(Modules.REGION)

  console.log("\n=== Corrigiendo Regiones ===\n")

  // Obtener todas las regiones
  const regions = await regionModule.listRegions({}, {
    relations: ["countries"]
  })

  // Buscar la región mal configurada
  const badRegion = regions.find((r: any) => r.name === "USA" && r.currency_code === "eur")

  if (badRegion) {
    console.log(`Encontrada región mal configurada: ${badRegion.name} (${badRegion.id})`)
    console.log(`  - Currency actual: ${badRegion.currency_code}`)
    console.log(`  - Countries: ${badRegion.countries?.map((c: any) => c.iso_2).join(", ")}`)

    // Actualizar a Perú con PEN
    await regionModule.updateRegions(badRegion.id, {
      name: "Perú",
      currency_code: "pen",
    })

    console.log("\n✓ Región actualizada a:")
    console.log("  - Nombre: Perú")
    console.log("  - Currency: pen")
    console.log("  - Countries: pe (mantenido)")
  }

  // Verificar si existe región para USD
  const usdRegion = regions.find((r: any) => r.currency_code === "usd")

  if (!usdRegion) {
    console.log("\nCreando región Internacional (USD)...")
    const newRegion = await regionModule.createRegions({
      name: "Internacional",
      currency_code: "usd",
      countries: ["us"],
    })
    console.log(`✓ Región Internacional creada: ${newRegion.id}`)
  } else {
    console.log(`\nRegión USD ya existe: ${usdRegion.name} (${usdRegion.id})`)
  }

  // Listar regiones finales
  console.log("\n=== Regiones Finales ===")
  const finalRegions = await regionModule.listRegions({}, {
    relations: ["countries"]
  })

  for (const region of finalRegions) {
    console.log(`${region.name}: ${region.currency_code.toUpperCase()} - países: ${region.countries?.map((c: any) => c.iso_2).join(", ")}`)
  }

  console.log("\n✓ Configuración completada")
}
