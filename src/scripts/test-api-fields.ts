import { remoteQueryObjectFromString, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function testApi({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "region",
    variables: {
        filters: { name: "Perú" }
    },
    fields: ["id", "name", "payment_providers.*"],
  })

  
  const result = await remoteQuery(queryObject)
}
