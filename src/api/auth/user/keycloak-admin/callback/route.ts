import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  console.log("=== Keycloak Admin Callback Debug ===")
  console.log("Full URL:", req.url)
  console.log("Query params:", JSON.stringify(req.query, null, 2))

  const authService = req.scope.resolve(Modules.AUTH)

  try {
    const { success, authIdentity, error } = await authService.validateCallback(
      "keycloak-admin",
      {
        url: req.url,
        headers: req.headers as unknown as Record<string, string>,
        query: req.query as any,
        protocol: req.protocol,
      }
    )

    console.log("Auth result - Success:", success, "Error:", error)
    console.log("Auth Identity:", authIdentity ? "Found" : "Not found")

    if (!success || !authIdentity) {
      console.error("Auth validation failed:", error)
      return res.status(401).json({
        error: "Authentication failed",
        details: error,
        debug: {
          hasCode: !!req.query?.code,
          hasState: !!req.query?.state,
          codeLength: (req.query?.code as string)?.length,
          stateLength: (req.query?.state as string)?.length,
          codeStart: (req.query?.code as string)?.substring(0, 20),
        }
      })
    }

    const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http
    const userId = authIdentity.app_metadata?.user_id

    console.log("User ID from auth identity:", userId)

    if (!userId) {
      console.error("No user_id in app_metadata, checking authIdentity:", JSON.stringify(authIdentity, null, 2))
      return res.status(403).json({
        error: "User authenticated but not linked to Medusa",
        authIdentity
      })
    }

    const token = jwt.sign(
      {
        actor_id: userId,
        actor_type: "user",
        auth_identity_id: authIdentity.id,
        app_metadata: authIdentity.app_metadata
      },
      jwtSecret,
      { expiresIn: "24h" }
    )

    console.log("Token generated successfully, redirecting...")

    const redirectUrl = `/app/login?access_token=${token}`
    return res.redirect(redirectUrl)

  } catch (error: any) {
    console.error("Unexpected error in callback:", error)
    return res.status(500).json({
      error: "Server error",
      message: error.message,
      stack: error.stack
    })
  }
}
