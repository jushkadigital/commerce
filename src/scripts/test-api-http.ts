import { ExecArgs } from "@medusajs/framework/types"

export default async function testApiHttp({ container }: ExecArgs) {
  const query = container.resolve("query")
  
  // What does the remote query actually get?
  const res = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.*"],
    filters: { name: "Perú" }
  })
}
