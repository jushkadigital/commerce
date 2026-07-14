import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
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

    if (!success || !authIdentity) {
      console.error("Auth failed:", error)
      return res.status(401).json({
        error: "Authentication failed",
        details: error
      })
    }

    let customerId = authIdentity.app_metadata?.customer_id

    if (!customerId) {
      const [providerIdentity] = await authService.listProviderIdentities({
        auth_identity_id: authIdentity.id
      })

      const email = (authIdentity as any).user_metadata?.email || (providerIdentity as any)?.user_metadata?.email

      if (!email) {
        console.error("No email found in auth_identity or provider_identity")
        return res.status(403).json({
          error: "Cuenta no registrada en la tienda.",
          auth_identity_id: authIdentity.id
        })
      }

      const customers = await customerModule.listCustomers({
        email
      })

      if (customers.length > 0) {
        customerId = customers[0].id

        await authService.updateAuthIdentities([{
          id: authIdentity.id,
          app_metadata: {
            ...authIdentity.app_metadata,
            customer_id: customerId
          }
        }])
      } else {
        console.error("Customer not found for email:", email)
        return res.status(403).json({
          error: "Cuenta no registrada en la tienda.",
          email
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

    const storefrontUrl = process.env.STORE_URL || "http://localhost:8000"
    const redirectUrl = `${storefrontUrl}/account?access_token=${token}`

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
