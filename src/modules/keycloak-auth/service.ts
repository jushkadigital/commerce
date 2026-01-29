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
    console.log("Keycloak endpoints:", endpoints)
    console.log("Keycloak URL:", this.options_.keycloakUrl)
    console.log("Realm:", this.options_.realm)
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
    console.log("=== KeycloakAdmin validateCallback ===")
    console.log("Query:", JSON.stringify(data.query, null, 2))
    return this.handleCallbackLogic(data, authIdentityProviderService)
  }

  private async handleCallbackLogic(data: any, authService: any) {
    try {
      console.log("=== handleCallbackLogic START ===")
      const { query } = data
      const code = query?.code as string
      const stateKey = query?.state as string

      console.log("Code present:", !!code, "Code length:", code?.length)
      console.log("State present:", !!stateKey, "State length:", stateKey?.length)
      console.log("Code (first 50 chars):", code?.substring(0, 50))

      if (!code || !stateKey) {
        console.error("Missing params - code:", !!code, "state:", !!stateKey)
        return { success: false, error: "Missing params" }
      }

      console.log("Getting state from authService with key:", stateKey)
      const state = await authService.getState(stateKey)
      console.log("State from service:", !!state)

      if (!state) {
        console.error("State expired or not found for key:", stateKey)
        return { success: false, error: "State expired" }
      }

      console.log("Exchanging code for access token...")
      const endpoints = this.getEndpoints()
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.options_.callbackUrl,
        client_id: this.options_.clientId,
        client_secret: this.options_.clientSecret,
      })

      console.log("Token endpoint:", endpoints.token)
      console.log("Redirect URI:", this.options_.callbackUrl)
      console.log("Client ID:", this.options_.clientId)

      let tokenRes
      try {
        console.log("Initiating fetch to Keycloak...")
        tokenRes = await fetch(endpoints.token, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString(),
        })
      } catch (fetchError: any) {
        console.error("Fetch failed to connect to Keycloak:", fetchError.message)
        console.error("Full error:", fetchError)
        return {
          success: false,
          error: `Failed to connect to Keycloak: ${fetchError.message}`
        }
      }

      console.log("Token response status:", tokenRes.status)

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
      console.log("Token received, fetching user info...")

      const userRes = await fetch(endpoints.userinfo, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })

      console.log("Userinfo response status:", userRes.status)

      if (!userRes.ok) {
        const errorText = await userRes.text()
        console.error("Userinfo fetch failed:", errorText)
        throw new Error("Keycloak Userinfo Failed")
      }

      const userInfo = await userRes.json()
      console.log("User info received, checking auth identity...")

      console.log("Entity ID (email):", userInfo.email)

      let authIdentity
      try {
        console.log("Attempting to retrieve existing auth identity...")
        authIdentity = await authService.retrieve({ entity_id: userInfo.email })
        console.log("Found existing auth identity:", authIdentity.id)
      } catch (e) {
        console.log("Auth identity not found, creating new one...")
        console.log("Creating with entity_id:", userInfo.email, "sub:", userInfo.sub)
        authIdentity = await authService.create({
          entity_id: userInfo.email,
          user_metadata: { email: userInfo.email, sub: userInfo.sub },
          app_metadata: {}
        })
        console.log("Created new auth identity:", authIdentity.id)
      }

      console.log("=== handleCallbackLogic SUCCESS ===")
      return { success: true, authIdentity }
    } catch (error: any) {
      console.error("=== handleCallbackLogic ERROR ===")
      console.error("Error:", error.message)
      console.error("Stack:", error.stack)
      return { success: false, error: error.message }
    }
  }
}

export default KeycloakAdminProviderService
