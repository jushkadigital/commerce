import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("=== Store Auth Keycloak Endpoint ===")

  const { accessToken } = req.body as { accessToken: string }
  console.log("Access token received:", !!accessToken)
  console.log("Token length:", accessToken?.length)

  try {
    if (!accessToken) {
      return res.status(400).json({
        message: "AccessToken is required",
        code: "MISSING_TOKEN"
      })
    }

    const decoded: any = jwt.decode(accessToken, { complete: true })
    const payload = decoded.payload

    console.log("Decoded token payload sub:", payload?.sub)
    console.log("Token email:", payload?.email)

    if (!payload?.sub) {
      return res.status(400).json({
        message: "Invalid token: missing 'sub' claim",
        code: "INVALID_TOKEN"
      })
    }

    const authModule = req.scope.resolve(Modules.AUTH)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    console.log("Searching for provider identity with sub:", payload.sub)
    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "keycloak-store",
      entity_id: payload.sub
    })

    console.log("Provider identity found:", !!providerIdentity)

    if (!providerIdentity) {
      console.error("Provider identity not found for sub:", payload.sub)
      return res.status(404).json({
        message: "Usuario no encontrado. El subscriber aún no ha sincronizado este usuario.",
        code: "NOT_SYNCED_YET",
        suggestion: "Por favor espere unos segundos y reintente.",
        sub: payload.sub,
        email: payload?.email
      })
    }

    console.log("Retrieving auth identity...")
    const authIdentity = await authModule.retrieveAuthIdentity(
      providerIdentity.auth_identity_id!
    )

    console.log("Auth identity found:", !!authIdentity)
    console.log("Auth identity app_metadata:", JSON.stringify(authIdentity.app_metadata, null, 2))

    let customerId = authIdentity.app_metadata?.customer_id as string
    console.log("Customer ID from app_metadata:", customerId)

    if (!customerId) {
      console.warn("No customer_id in app_metadata, attempting fallback by email...")

      const email = payload?.email || (authIdentity as any).user_metadata?.email
      console.log("Searching customer by email:", email)

      const [customer] = await customerModule.listCustomers({ email })

      if (customer) {
        console.log("Found customer via fallback:", customer.id)
        customerId = customer.id

        await authModule.updateAuthIdentities([{
          id: authIdentity.id,
          app_metadata: {
            ...authIdentity.app_metadata,
            customer_id: customerId
          }
        }])
        console.log("Updated auth_identity with customer_id")
      } else {
        console.error("Customer not found for email:", email)
        return res.status(404).json({
          message: "Cliente no encontrado. El subscriber aún no ha creado la cuenta.",
          code: "CUSTOMER_NOT_CREATED_YET",
          suggestion: "Por favor espere unos segundos y reintente.",
          email: email
        })
      }
    }

    console.log("Customer ID to use:", customerId)

    const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http

    const token = jwt.sign(
      {
        actor_id: customerId,
        actor_type: "customer",
        auth_identity_id: authIdentity.id,
        app_metadata: authIdentity.app_metadata
      },
      jwtSecret,
      { expiresIn: "7d" }
    )

    console.log("Token generated successfully, length:", token.length)

    req.session.customer_id = customerId

    const cookieName = "_medusa_jwt"
    const isProduction = process.env.NODE_ENV === "production"

    console.log("Setting cookie:", cookieName, "production:", isProduction)

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    })

    console.log("Login successful, returning response")

    res.json({
      message: "Login exitoso",
      customer_id: customerId,
      token: token
    })
  } catch (error: any) {
    console.error("Error in store auth keycloak:", error)
    console.error("Error stack:", error.stack)
    res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_ERROR",
      error: error.message
    })
  }
}
