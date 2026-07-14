import { Modules } from "@medusajs/framework/utils"

export default async function checkUserAuth({ container, args }) {
  const email = args[0]

  if (!email) {
    return
  }

  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)


  // 1. Buscar usuario admin
  const users = await userModule.listUsers({ email })

  if (users.length === 0) {
  } else {
    for (const user of users) {
    }
  }

  // 2. Buscar auth identities
  try {
    const authIdentities = await authModule.listAuthIdentities({})
    const matchingIdentities = authIdentities.filter(
      (ai: any) => ai.provider_identities?.some((pi: any) => pi.entity_id === email)
    )

    if (matchingIdentities.length === 0) {
      // Buscar de otra forma
      const allIdentities = await authModule.listAuthIdentities({})

      for (const ai of allIdentities) {
        const providers = ai.provider_identities || []
        for (const pi of providers) {
          if (pi.entity_id?.includes(email.split('@')[0]) || pi.user_metadata?.email === email) {
          }
        }
      }
    } else {
      for (const ai of matchingIdentities) {
        for (const pi of ai.provider_identities || []) {
        }
      }
    }
  } catch (error) {
  }

  // 3. Verificar vinculación
  if (users.length > 0) {
    const user = users[0]
    try {
      // Buscar si hay auth identity vinculada a este usuario
      const query = container.resolve("query")
      const { data } = await query.graph({
        entity: "user",
        fields: ["id", "email", "auth_identities.*"],
        filters: { id: user.id },
      })

      if (data?.[0]?.auth_identities?.length > 0) {
        for (const ai of data[0].auth_identities) {
        }
      } else {
      }
    } catch (error) {
    }
  }

}
