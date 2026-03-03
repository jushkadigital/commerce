import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function testRegionQuery({ container }: ExecArgs) {
  const query = container.resolve("query")

  console.log("\n=== Test 1: query.graph con payment_providers.* ===")
  const result1 = await query.graph({
    entity: "region",
    fields: ["*", "payment_providers.*"],
    filters: { name: "Perú" }
  })
  console.log(JSON.stringify(result1.data[0].payment_providers, null, 2))

  console.log("\n=== Test 2: query.graph con *payment_providers ===")
  const result2 = await query.graph({
    entity: "region",
    fields: ["*", "*payment_providers"],
    filters: { name: "Perú" }
  })
  console.log(JSON.stringify(result2.data[0].payment_providers, null, 2))
}
