import {
  AbstractAuthModuleProvider,
  MedusaError
} from "@medusajs/framework/utils"
import {
  AuthIdentityProviderService,
  AuthenticationInput,
  AuthenticationResponse,
  Logger,
} from "@medusajs/framework/types"
import crypto from "crypto"

type KeycloakAdminOptions = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  scope?: string
}
class KeycloakAdminProviderService extends AbstractAuthModuleProvider {
  static identifier = "keycloak-admin"
  static DISPLAY_NAME = "Keycloak Admin SSO"

  protected logger_: Logger
  protected options_: KeycloakAdminOptions

  constructor(
    { logger }: { logger: Logger },
    options: KeycloakAdminOptions
  ) {
    // @ts-ignore
    super(...arguments)
    this.logger_ = logger
    this.options_ = options
  }

  private getEndpoints() {
    const baseUrl = `${this.options_.keycloakUrl}/realms/${this.options_.realm}/protocol/openid-connect`
    return {
      authorization: `${baseUrl}/auth`,
      token: `${baseUrl}/token`,
      userinfo: `${baseUrl}/userinfo`,
    }
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    try {
      const returnUrl =
        (data.query?.return_url as string) ||
        (data.body?.callback_url as string) ||
        this.options_.callbackUrl

      // Generamos state único
      const stateKey = crypto.randomBytes(32).toString("hex")

      await authIdentityProviderService.setState(stateKey, {
        callback_url: this.options_.callbackUrl,
        return_to: returnUrl,
      })

      const endpoints = this.getEndpoints()
      const authParams = new URLSearchParams({
        client_id: this.options_.clientId,
        redirect_uri: this.options_.callbackUrl,
        response_type: "code",
        scope: this.options_.scope || "openid profile email",
        state: stateKey,
      })

      return {
        success: true,
        location: `${endpoints.authorization}?${authParams.toString()}`,
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    return this.handleCallbackLogic(data, authIdentityProviderService)
  }

  // Lógica compartida de intercambio de token (DRY)
  private async handleCallbackLogic(data: any, authService: any) {
    try {
      const { query } = data
      const code = query?.code as string
      const stateKey = query?.state as string

      if (!code || !stateKey) return { success: false, error: "Missing params" }

      const state = await authService.getState(stateKey)
      if (!state) return { success: false, error: "State expired" }

      const endpoints = this.getEndpoints()
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.options_.callbackUrl,
        client_id: this.options_.clientId,
        client_secret: this.options_.clientSecret,
      })

      const tokenRes = await fetch(endpoints.token, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams.toString(),
      })

      if (!tokenRes.ok) throw new Error("Keycloak Token Failed")
      const tokenData = await tokenRes.json()

      const userRes = await fetch(endpoints.userinfo, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      const userInfo = await userRes.json()

      // Recuperar o Crear Identidad Básica
      let authIdentity
      try {
        authIdentity = await authService.retrieve({ entity_id: userInfo.email })
      } catch (e) {
        authIdentity = await authService.create({
          entity_id: userInfo.email,
          user_metadata: { email: userInfo.email, sub: userInfo.sub },
          app_metadata: {}
        })
      }

      return { success: true, authIdentity }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export default KeycloakAdminProviderService
