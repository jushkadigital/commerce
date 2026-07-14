import { remoteQueryObjectFromString } from "@medusajs/framework/utils"

const obj = remoteQueryObjectFromString({
  entryPoint: "region",
  variables: {},
  fields: ["id", "name", "*payment_providers"]
})

