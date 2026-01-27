import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

/**
 * POST /auth/user/keycloak/token
 *
 * Exchange a Keycloak access token for a Medusa session token.
 * This allows server-to-server authentication using Keycloak tokens.
 *
 * Usage:
 * 1. Get a token from Keycloak (via password grant or client credentials)
 * 2. POST to this endpoint with that token
 * 3. Receive a Medusa token to use for subsequent requests
 *
 * Body: { "keycloak_token": "eyJ..." }
 * Or Header: Authorization: Bearer <keycloak_token>
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Get Keycloak token from body or Authorization header
    let keycloakToken = (req.body as any)?.keycloak_token

    if (!keycloakToken) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith("Bearer ")) {
        keycloakToken = authHeader.substring(7)
      }
    }

    if (!keycloakToken) {
      return res.status(400).json({
        message: "Missing keycloak_token in body or Authorization header",
      })
    }

    // Decode the Keycloak token (without verification first to get the payload)
    const decodedToken = jwt.decode(keycloakToken) as any

    if (!decodedToken) {
      return res.status(400).json({ message: "Invalid token format" })
    }

    console.log("[Keycloak Token] Decoded payload:", {
      sub: decodedToken.sub,
      email: decodedToken.email,
      preferred_username: decodedToken.preferred_username,
    })

    // Validate token with Keycloak userinfo endpoint
    const keycloakUrl = process.env.KEYCLOAK_URL
    const realm = process.env.KEYCLOAK_REALM

    if (!keycloakUrl || !realm) {
      return res.status(500).json({ message: "Keycloak not configured" })
    }

    const userInfoUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/userinfo`
    const userInfoRes = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${keycloakToken}`,
      },
    })

    if (!userInfoRes.ok) {
      const errorText = await userInfoRes.text()
      console.log("[Keycloak Token] Userinfo failed:", errorText)
      return res.status(401).json({
        message: "Invalid or expired Keycloak token",
        error: errorText,
      })
    }

    const userInfo = await userInfoRes.json()
    console.log("[Keycloak Token] Userinfo:", userInfo)

    const email = userInfo.email || userInfo.preferred_username
    const keycloakSub = userInfo.sub

    if (!email) {
      return res.status(400).json({ message: "No email in Keycloak token" })
    }

    // Find the auth identity for this Keycloak user
    const authModule = req.scope.resolve(Modules.AUTH)

    const authIdentities = await authModule.listAuthIdentities(
      {},
      { relations: ["provider_identities"] }
    )

    const matchingIdentity = authIdentities.find((ai: any) =>
      ai.provider_identities?.some(
        (pi: any) => pi.provider === "keycloak-admin" && pi.entity_id === email
      )
    )

    if (!matchingIdentity) {
      return res.status(404).json({
        message: "No Medusa user linked to this Keycloak account",
        email,
        keycloak_sub: keycloakSub,
      })
    }

    const userId = matchingIdentity.app_metadata?.user_id

    if (!userId) {
      return res.status(404).json({
        message: "Auth identity exists but no user linked",
        auth_identity_id: matchingIdentity.id,
      })
    }

    // Generate Medusa JWT token
    const jwtSecret = process.env.JWT_SECRET || "supersecret"
    const medusaToken = jwt.sign(
      {
        actor_id: userId,
        actor_type: "user",
        auth_identity_id: matchingIdentity.id,
      },
      jwtSecret,
      { expiresIn: "24h" }
    )

    console.log("[Keycloak Token] Generated Medusa token for user:", userId)

    res.json({
      token: medusaToken,
      user_id: userId,
      auth_identity_id: matchingIdentity.id,
    })
  } catch (error: any) {
    console.error("[Keycloak Token] Error:", error)
    res.status(500).json({
      message: "Failed to exchange token",
      error: error.message,
    })
  }
}
