import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // 1. Validar con Keycloak (Auth Service)
  const authService = req.scope.resolve(Modules.AUTH)
  const customerModule = req.scope.resolve(Modules.CUSTOMER) // <--- Cambiamos User por Customer

  const { success, authIdentity, error } = await authService.validateCallback(
    "keycloak-store", // ID del provider
    {
      url: req.url,
      headers: req.headers as unknown as Record<string, string>,
      query: req.query,
      protocol: req.protocol,
    }
  )

  if (!success || !authIdentity) {
    // Redirigir al front con error (opcional) o mostrar texto
    return res.status(401).send(`Auth Error: ${error}`)
  }

  // 2. SELF-HEALING: Asegurar vínculo con Customer
  let customerId = authIdentity.app_metadata?.customer_id

  if (!customerId) {
    // Buscar cliente por email
    const customers = await customerModule.listCustomers({ email: authIdentity.entity_id })

    if (customers.length > 0) {
      customerId = customers[0].id
      // Reparar vínculo
      await authService.updateAuthIdentities([{
        id: authIdentity.id,
        app_metadata: { ...authIdentity.app_metadata, customer_id: customerId }
      }])
    } else {
      // Opcional: Crear Customer JIT aquí si quieres registro automático
      // const newCus = await customerModule.createCustomers({ email: ... })
      // customerId = newCus.id
      return res.status(403).send("Cuenta no registrada en la tienda.")
    }
  }

  // 3. Generar Token para CUSTOMER
  const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http
  const token = jwt.sign(
    {
      actor_id: customerId,
      actor_type: "customer", // <--- Importante: customer
      auth_identity_id: authIdentity.id,
      app_metadata: authIdentity.app_metadata
    },
    jwtSecret,
    { expiresIn: "30d" } // Sesiones de tienda suelen ser más largas
  )

  // 4. REDIRECCIÓN AL STOREFRONT (Next.js)
  // Ajusta la URL base de tu frontend
  const storefrontUrl = process.env.STORE_URL || "http://localhost:8000"

  // Redirigimos a una página que capture el token (ej: /account o /auth/callback)
  return res.redirect(`${storefrontUrl}/account?access_token=${token}`)
}
