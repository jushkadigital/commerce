import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function testRegionQuery({ container }: ExecArgs) {
  const query = container.resolve("query")

  const result1 = await query.graph({
    entity: "region",
    fields: ["*", "payment_providers.*"],
    filters: { name: "Perú" }
  })

  const result2 = await query.graph({
    entity: "region",
    fields: ["*", "*payment_providers"],
    filters: { name: "Perú" }
  })
}
