import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function listRegions({ container }: ExecArgs) {
  const regionModule = container.resolve(Modules.REGION)

  const regions = await regionModule.listRegions({}, {
    relations: ["countries"]
  })

  for (const region of regions) {
  }
}
