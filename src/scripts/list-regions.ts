import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function listRegions({ container }: ExecArgs) {
  const regionModule = container.resolve(Modules.REGION)

  const regions = await regionModule.listRegions({}, {
    relations: ["countries"]
  })

  console.log("\n=== Regiones existentes ===\n")
  for (const region of regions) {
    console.log(`Region: ${region.name} (${region.id})`)
    console.log(`  Currency: ${region.currency_code}`)
    console.log(`  Countries: ${region.countries?.map((c: any) => c.iso_2).join(", ") || "ninguno"}`)
    console.log("")
  }
}
