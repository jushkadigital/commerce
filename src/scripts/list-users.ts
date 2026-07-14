import { Modules } from "@medusajs/framework/utils"

export default async function listUsers({ container }) {
  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)

  const users = await userModule.listUsers({})

  for (const user of users) {
  }

  const authIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )
  for (const ai of authIdentities) {
    const providers = ai.provider_identities || []
    for (const pi of providers) {
    }
  }
}
