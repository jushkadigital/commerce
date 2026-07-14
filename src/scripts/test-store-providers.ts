import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

export default async function testStoreProviders({ container }: ExecArgs) {
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const regionModule = container.resolve("region")
  
  const regions = await regionModule.listRegions({})
  const regionPeru = regions.find((r: any) => r.name === "Perú")
  

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "region_payment_provider",
    variables: {
        filters: {
            region_id: regionPeru.id,
        },
    },
    fields: ["payment_provider.*"],
  })

  const result1 = await remoteQuery(queryObject)
}
