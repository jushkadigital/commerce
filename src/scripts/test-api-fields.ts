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

  console.log("Query object generated:", JSON.stringify(queryObject, null, 2))
  
  const result = await remoteQuery(queryObject)
  console.log("Result:", JSON.stringify(result, null, 2))
}
