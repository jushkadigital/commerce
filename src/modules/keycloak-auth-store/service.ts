// src/modules/auth/providers/keycloak-store.ts
import {
  AbstractAuthModuleProvider,
  MedusaError
} from "@medusajs/framework/utils"
import {
  AuthenticationInput,
  AuthenticationResponse
} from "@medusajs/framework/types"

class KeycloakStoreProvider extends AbstractAuthModuleProvider {
  static identifier = "keycloak-store" // <--- ESTO ES LO QUE BUSCA EL SUBSCRIBER
  static DISPLAY_NAME = "Keycloak Store"

  // Estos métodos son obligatorios por contrato, 
  // pero NextAuth nunca los llamará directamente para el login.

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: any
  ): Promise<AuthenticationResponse> {
    // Si por error alguien intenta loguearse por aquí, devolvemos error
    // o implementamos la lógica básica si quieres un fallback.
    return {
      success: false,
      error: "Please use NextAuth for authentication"
    }
  }

  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: any
  ): Promise<AuthenticationResponse> {
    // No se usará porque NextAuth maneja el callback
    return { success: false, error: "Not implemented" }
  }
}

export default KeycloakStoreProvider
