import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  console.log("=== Keycloak Store Callback ===")
  console.log("Full URL:", req.url)
  console.log("Query params:", JSON.stringify(req.query, null, 2))

  const authService = req.scope.resolve(Modules.AUTH)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  try {
    const { success, authIdentity, error } = await authService.validateCallback(
      "keycloak-store",
      {
        url: req.url,
        headers: req.headers as unknown as Record<string, string>,
        query: req.query as any,
        protocol: req.protocol,
      }
    )

    console.log("Auth result - Success:", success, "Error:", error)
    console.log("Auth Identity:", authIdentity ? JSON.stringify(authIdentity, null, 2) : "Not found")

    if (!success || !authIdentity) {
      console.error("Auth failed:", error)
      return res.status(401).json({
        error: "Authentication failed",
        details: error
      })
    }

    let customerId = authIdentity.app_metadata?.customer_id
    console.log("Customer ID from app_metadata:", customerId)

    if (!customerId) {
      console.log("No customer_id in app_metadata, searching by email...")

      const [providerIdentity] = await authService.listProviderIdentities({
        auth_identity_id: authIdentity.id
      })

      console.log("Provider identity found:", !!providerIdentity)

      const email = (authIdentity as any).user_metadata?.email || (providerIdentity as any)?.user_metadata?.email
      console.log("Email from metadata:", email)

      if (!email) {
        console.error("No email found in auth_identity or provider_identity")
        return res.status(403).json({
          error: "Cuenta no registrada en la tienda.",
          auth_identity_id: authIdentity.id
        })
      }

      const customers = await customerModule.listCustomers({
        email: email
      })

      console.log("Found customers:", customers.length)

      if (customers.length > 0) {
        customerId = customers[0].id
        console.log("Found customer:", customerId)

        await authService.updateAuthIdentities([{
          id: authIdentity.id,
          app_metadata: {
            ...authIdentity.app_metadata,
            customer_id: customerId
          }
        }])
        console.log("Updated auth_identity with customer_id")
      } else {
        console.error("Customer not found for email:", email)
        return res.status(403).json({
          error: "Cuenta no registrada en la tienda.",
          email: email
        })
      }
    }

    const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http

    const token = jwt.sign(
      {
        actor_id: customerId,
        actor_type: "customer",
        auth_identity_id: authIdentity.id,
        app_metadata: authIdentity.app_metadata
      },
      jwtSecret,
      { expiresIn: "30d" }
    )

    console.log("Token generated, redirecting to storefront...")

    const storefrontUrl = process.env.STORE_URL || "http://localhost:8000"
    const redirectUrl = `${storefrontUrl}/account?access_token=${token}`

    console.log("Redirect URL:", redirectUrl)
    return res.redirect(redirectUrl)

  } catch (error: any) {
    console.error("Error in keycloak-store callback:", error)
    console.error("Stack:", error.stack)
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    })
  }
}
