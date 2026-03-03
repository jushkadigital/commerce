import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function testRemoteQuery({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  console.log("\n=== Test 1: remoteQuery con *payment_providers ===")
  const queryObject1 = {
    region: {
      fields: ["id", "name", "*payment_providers"],
      __args: { filters: { name: "Perú" } }
    }
  }

  const result1 = await remoteQuery(queryObject1)
  console.log(JSON.stringify(result1, null, 2))

  console.log("\n=== Test 2: remoteQuery con payment_providers.* ===")
  const queryObject2 = {
    region: {
      fields: ["id", "name", "payment_providers.*"],
      __args: { filters: { name: "Perú" } }
    }
  }

  const result2 = await remoteQuery(queryObject2)
  console.log(JSON.stringify(result2, null, 2))
}
