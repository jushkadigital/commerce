import { Modules } from "@medusajs/framework/utils"

export default async function testAuthRetrieve({ container }) {
  const authModule = container.resolve(Modules.AUTH)

  // Email del usuario de prueba
  const email = "urgosxd5@gmail.com"

  console.log("\n=== Test de AuthIdentityProviderService ===\n")

  // 1. Listar auth identities directamente
  console.log("1. Auth Identity desde authModule.listAuthIdentities:")
  const allIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )

  const matching = allIdentities.find(ai =>
    ai.provider_identities?.some(pi => pi.entity_id === email)
  )

  if (matching) {
    console.log("   ID: " + matching.id)
    console.log("   App Metadata: " + JSON.stringify(matching.app_metadata || {}))
    console.log("   Provider Identities:")
    for (const pi of matching.provider_identities || []) {
      console.log("     - ID: " + pi.id)
      console.log("       Provider: " + pi.provider)
      console.log("       Entity ID: " + pi.entity_id)
      console.log("       User Metadata: " + JSON.stringify(pi.user_metadata || {}))
    }
  } else {
    console.log("   No encontrada auth identity para " + email)
  }

  // 2. Intentar retrieve como lo haría el proveedor
  console.log("\n2. Simulando authIdentityProviderService.retrieve:")
  console.log("   El proveedor llama a .retrieve({ entity_id: '" + email + "' })")
  console.log("   Esto busca en provider_identities por entity_id")

  // 3. Verificar qué devuelve el retrieve del authModule
  console.log("\n3. Usando authModule.retrieveAuthIdentity con el ID:")
  if (matching) {
    const retrieved = await authModule.retrieveAuthIdentity(matching.id, {
      relations: ["provider_identities"]
    })
    console.log("   ID: " + retrieved.id)
    console.log("   App Metadata: " + JSON.stringify(retrieved.app_metadata || {}))
    console.log("   Provider Identities count: " + (retrieved.provider_identities?.length || 0))
  }

  // 4. Verificar si el problema es que no retorna app_metadata en ciertos casos
  console.log("\n4. Verificando estructura completa del auth_identity:")
  if (matching) {
    console.log("   Tiene user_id en app_metadata: " + (matching.app_metadata?.user_id ? "SI" : "NO"))
    if (matching.app_metadata?.user_id) {
      console.log("   user_id: " + matching.app_metadata.user_id)
    }
  }

  console.log("\n=== Fin del test ===\n")
}
