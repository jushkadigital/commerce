import { Modules } from "@medusajs/framework/utils"

/**
 * Este script simula lo que hace el Keycloak provider cuando
 * un usuario inicia sesión, para ver qué devuelve authIdentityProviderService
 */
export default async function simulateKeycloakLogin({ container }) {
  const authModule = container.resolve(Modules.AUTH)
  const email = "urgosxd5@gmail.com"

  console.log("\n=== Simulando Login con Keycloak ===\n")

  // Obtener el auth identity directamente
  const allIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )

  const matching = allIdentities.find(ai =>
    ai.provider_identities?.some(pi => pi.entity_id === email && pi.provider === "keycloak")
  )

  if (!matching) {
    console.log("ERROR: No se encontró auth identity para " + email)
    return
  }

  console.log("Auth Identity encontrada:")
  console.log("  ID: " + matching.id)
  console.log("  app_metadata: " + JSON.stringify(matching.app_metadata))

  const keycloakProvider = matching.provider_identities?.find(pi => pi.provider === "keycloak")
  if (keycloakProvider) {
    console.log("  provider_identity.id: " + keycloakProvider.id)
    console.log("  provider_identity.entity_id: " + keycloakProvider.entity_id)
    console.log("  provider_identity.user_metadata: " + JSON.stringify(keycloakProvider.user_metadata))
  }

  // Verificar que user_id está presente
  const userId = matching.app_metadata?.user_id
  if (userId) {
    console.log("\n✓ user_id está presente en app_metadata: " + userId)

    // Verificar que el user existe
    const userModule = container.resolve(Modules.USER)
    try {
      const user = await userModule.retrieveUser(userId)
      console.log("✓ Usuario encontrado: " + user.email)
    } catch (e) {
      console.log("✗ ERROR: Usuario " + userId + " no existe!")
    }
  } else {
    console.log("\n✗ ERROR: user_id NO está en app_metadata!")
  }

  // Simular lo que devuelve authIdentityProviderService.retrieve()
  // El provider service es interno, pero podemos verificar la estructura
  console.log("\n=== Para el Token ===")
  console.log("El token JWT debe tener:")
  console.log("  actor_id: " + (userId || "MISSING!"))
  console.log("  actor_type: 'user'")
  console.log("  auth_identity_id: " + matching.id)

  console.log("\n=== Fin de la simulación ===\n")
}
