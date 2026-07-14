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
  keycloakUrl: string
  realm: string
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
    const endpoints = {
      authorization: `${baseUrl}/auth`,
      token: `${baseUrl}/token`,
      userinfo: `${baseUrl}/userinfo`,
    }
    return endpoints
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

  private async handleCallbackLogic(data: any, authService: any) {
    try {
      const { query } = data
      const code = query?.code as string
      const stateKey = query?.state as string

      if (!code || !stateKey) {
        return { success: false, error: "Missing params" }
      }

      const state = await authService.getState(stateKey)

      if (!state) {
        console.error("State expired or not found for key:", stateKey)
        return { success: false, error: "State expired" }
      }

      const endpoints = this.getEndpoints()
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.options_.callbackUrl,
        client_id: this.options_.clientId,
        client_secret: this.options_.clientSecret,
      })

      let tokenRes
      try {
        tokenRes = await fetch(endpoints.token, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString(),
        })
      } catch (fetchError: any) {
        return {
          success: false,
          error: `Failed to connect to Keycloak: ${fetchError.message}`
        }
      }

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text()
        console.error("Token exchange failed - Status:", tokenRes.status)
        console.error("Error response:", errorText)
        return {
          success: false,
          error: `Keycloak Token Failed (${tokenRes.status}): ${errorText}`
        }
      }

const tokenData = await tokenRes.json()
      const userRes = await fetch(endpoints.userinfo, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })

      if (!userRes.ok) {
        const errorText = await userRes.text()
        throw new Error("Keycloak Userinfo Failed")
      }

      const userInfo = await userRes.json()
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
