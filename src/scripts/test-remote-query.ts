import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function testRemoteQuery({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const queryObject1 = {
    region: {
      fields: ["id", "name", "*payment_providers"],
      __args: { filters: { name: "Perú" } }
    }
  }

  const result1 = await remoteQuery(queryObject1)

  const queryObject2 = {
    region: {
      fields: ["id", "name", "payment_providers.*"],
      __args: { filters: { name: "Perú" } }
    }
  }

  const result2 = await remoteQuery(queryObject2)
}
