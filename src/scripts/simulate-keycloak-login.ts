import { Modules } from "@medusajs/framework/utils"

/**
 * Este script simula lo que hace el Keycloak provider cuando
 * un usuario inicia sesión, para ver qué devuelve authIdentityProviderService
 */
export default async function simulateKeycloakLogin({ container }) {
  const authModule = container.resolve(Modules.AUTH)
  const email = "urgosxd5@gmail.com"


  // Obtener el auth identity directamente
  const allIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )

  const matching = allIdentities.find(ai =>
    ai.provider_identities?.some(pi => pi.entity_id === email && pi.provider === "keycloak")
  )

  if (!matching) {
    return
  }


  const keycloakProvider = matching.provider_identities?.find(pi => pi.provider === "keycloak")
  if (keycloakProvider) {
  }

  // Verificar que user_id está presente
  const userId = matching.app_metadata?.user_id
  if (userId) {

    // Verificar que el user existe
    const userModule = container.resolve(Modules.USER)
    try {
      const user = await userModule.retrieveUser(userId)
    } catch (e) {
    }
  } else {
  }

  // Simular lo que devuelve authIdentityProviderService.retrieve()
  // El provider service es interno, pero podemos verificar la estructura

}
