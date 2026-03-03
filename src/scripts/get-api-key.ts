import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function getApiKey({ container }: ExecArgs) {
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const apiKeys = await apiKeyModule.listApiKeys({ type: "publishable" })
  console.log("KEY:", apiKeys[0]?.token)
}
