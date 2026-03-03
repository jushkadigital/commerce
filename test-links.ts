import { ExecArgs } from "@medusajs/framework/types"

export default async function testLinks({ container }: ExecArgs) {
  const remoteQuery = container.resolve("remoteQuery")
  const link = container.resolve("link")
  
  // 1. check direct links in DB
  const rawLinks = await remoteQuery({
    region_payment_provider: {
      fields: ["region_id", "payment_provider_id"]
    }
  })
  console.log("Raw Links:", JSON.stringify(rawLinks, null, 2))

  // 2. what does payment_providers return?
  const res2 = await remoteQuery({
    region: {
      fields: ["id", "name", "payment_providers.*"],
    }
  })
  console.log("RES2 payment_providers.*:", JSON.stringify(res2, null, 2))
}
