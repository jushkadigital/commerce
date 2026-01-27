import { Modules } from "@medusajs/framework/utils"

export default async function listUsers({ container }) {
  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)

  const users = await userModule.listUsers({})

  console.log("\n=== USUARIOS ADMIN ===")
  for (const user of users) {
    console.log("Email: " + user.email)
    console.log("ID: " + user.id)
    console.log("Metadata: " + JSON.stringify(user.metadata || {}))
    console.log("---")
  }
  console.log("Total: " + users.length + " usuarios")

  console.log("\n=== AUTH IDENTITIES (con provider_identities) ===")
  const authIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )
  for (const ai of authIdentities) {
    console.log("Auth ID: " + ai.id)
    console.log("App Metadata: " + JSON.stringify(ai.app_metadata || {}))
    const providers = ai.provider_identities || []
    console.log("Provider Identities Count: " + providers.length)
    for (const pi of providers) {
      console.log("  Provider: " + pi.provider)
      console.log("  Entity ID: " + pi.entity_id)
      console.log("  User Metadata: " + JSON.stringify(pi.user_metadata || {}))
    }
    console.log("---")
  }
  console.log("Total: " + authIdentities.length + " auth identities\n")
}
