import { ExecArgs } from "@medusajs/framework/types"

export default async function testApiHttp({ container }: ExecArgs) {
  const query = container.resolve("query")
  
  // What does the remote query actually get?
  console.log("\n=== Test 3: query.graph directly with *payment_providers ===")
  const res = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.*"],
    filters: { name: "Perú" }
  })
  console.log("Providers via graph:", res.data[0]?.payment_providers?.map(p => p.id))
}
