import { ExecArgs } from "@medusajs/framework/types"

export default async function testAdminReq({ container }: ExecArgs) {
  const remoteQuery = container.resolve("remoteQuery")
  // emulate what the core does
  const { remoteQueryObjectFromString } = require("@medusajs/framework/utils")
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "region",
    variables: {},
    fields: ["id", "name", "payment_providers.*"]
  })
  console.log("Query object:", JSON.stringify(queryObject, null, 2))
  
  const res1 = await remoteQuery(queryObject)
  console.log("RES1:", JSON.stringify(res1, null, 2))
}
