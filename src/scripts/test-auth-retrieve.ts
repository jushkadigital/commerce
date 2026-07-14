import { Modules } from "@medusajs/framework/utils"

export default async function testAuthRetrieve({ container }) {
  const authModule = container.resolve(Modules.AUTH)

  // Email del usuario de prueba
  const email = "urgosxd5@gmail.com"


  // 1. Listar auth identities directamente
  const allIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )

  const matching = allIdentities.find(ai =>
    ai.provider_identities?.some(pi => pi.entity_id === email)
  )

  if (matching) {
    for (const pi of matching.provider_identities || []) {
    }
  } else {
  }

  // 2. Intentar retrieve como lo haría el proveedor

  // 3. Verificar qué devuelve el retrieve del authModule
  if (matching) {
    const retrieved = await authModule.retrieveAuthIdentity(matching.id, {
      relations: ["provider_identities"]
    })
  }

  // 4. Verificar si el problema es que no retorna app_metadata en ciertos casos
  if (matching) {
    if (matching.app_metadata?.user_id) {
    }
  }

}
