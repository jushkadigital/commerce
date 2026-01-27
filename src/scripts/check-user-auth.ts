import { Modules } from "@medusajs/framework/utils"

export default async function checkUserAuth({ container, args }) {
  const email = args[0]

  if (!email) {
    console.log("\nUso: npx medusa exec ./src/scripts/check-user-auth.ts <email>")
    console.log("Ejemplo: npx medusa exec ./src/scripts/check-user-auth.ts admin@empresa.com\n")
    return
  }

  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)

  console.log(`\n=== Diagnóstico para: ${email} ===\n`)

  // 1. Buscar usuario admin
  console.log("1. USUARIOS ADMIN:")
  const users = await userModule.listUsers({ email })

  if (users.length === 0) {
    console.log("   ❌ No existe usuario admin con ese email")
  } else {
    for (const user of users) {
      console.log(`   ✓ ID: ${user.id}`)
      console.log(`     Email: ${user.email}`)
      console.log(`     Nombre: ${user.first_name} ${user.last_name}`)
      console.log(`     Metadata: ${JSON.stringify(user.metadata || {})}`)
    }
  }

  // 2. Buscar auth identities
  console.log("\n2. AUTH IDENTITIES:")
  try {
    const authIdentities = await authModule.listAuthIdentities({})
    const matchingIdentities = authIdentities.filter(
      (ai: any) => ai.provider_identities?.some((pi: any) => pi.entity_id === email)
    )

    if (matchingIdentities.length === 0) {
      // Buscar de otra forma
      const allIdentities = await authModule.listAuthIdentities({})
      console.log(`   Total auth identities en el sistema: ${allIdentities.length}`)

      for (const ai of allIdentities) {
        const providers = ai.provider_identities || []
        for (const pi of providers) {
          if (pi.entity_id?.includes(email.split('@')[0]) || pi.user_metadata?.email === email) {
            console.log(`   Posible match:`)
            console.log(`     ID: ${ai.id}`)
            console.log(`     Entity ID: ${pi.entity_id}`)
            console.log(`     Provider: ${pi.provider}`)
            console.log(`     User Metadata: ${JSON.stringify(pi.user_metadata || {})}`)
            console.log(`     App Metadata: ${JSON.stringify(ai.app_metadata || {})}`)
          }
        }
      }
    } else {
      for (const ai of matchingIdentities) {
        console.log(`   ✓ Auth Identity ID: ${ai.id}`)
        console.log(`     App Metadata: ${JSON.stringify(ai.app_metadata || {})}`)
        for (const pi of ai.provider_identities || []) {
          console.log(`     Provider: ${pi.provider}`)
          console.log(`     Entity ID: ${pi.entity_id}`)
          console.log(`     User Metadata: ${JSON.stringify(pi.user_metadata || {})}`)
        }
      }
    }
  } catch (error) {
    console.log(`   Error listando auth identities: ${error.message}`)
  }

  // 3. Verificar vinculación
  console.log("\n3. VINCULACIÓN USER ↔ AUTH_IDENTITY:")
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
        console.log("   ✓ Usuario tiene auth_identities vinculadas:")
        for (const ai of data[0].auth_identities) {
          console.log(`     - ${ai.id} (provider: ${ai.provider_identities?.[0]?.provider || 'unknown'})`)
        }
      } else {
        console.log("   ❌ Usuario NO tiene auth_identities vinculadas")
        console.log("   → El usuario existe pero no está conectado a Keycloak")
      }
    } catch (error) {
      console.log(`   Error verificando vinculación: ${error.message}`)
    }
  }

  console.log("\n=== Fin del diagnóstico ===\n")
}
