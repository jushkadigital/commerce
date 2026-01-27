import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { accessToken } = req.body
  // ... validaciones de token ...
  const decoded: any = jwt.decode(accessToken)
  const authModule = req.scope.resolve(Modules.AUTH)

  // 1. CORRECCIÓN: Buscamos en 'ProviderIdentities' 
  // Aquí sí existen los campos 'provider' y 'entity_id'
  const [providerIdentity] = await authModule.listProviderIdentities({
    provider: "keycloak-store", // Debe coincidir con tu subscriber
    entity_id: decoded.sub    // O decoded.sub si cambiaste la lógica
  })

  // Si no existe la provider identity, el usuario no está sincronizado
  if (!providerIdentity) {
    return res.status(404).json({
      message: "Usuario no encontrado. Espera un momento a que termine la sincronización.",
      code: "NOT_SYNCED_YET"
    })
  }

  // 2. Recuperamos la AuthIdentity padre (si necesitamos metadata de allí)
  // Aunque para el login, lo vital es llegar al customer_id.
  const authIdentity = await authModule.retrieveAuthIdentity(
    providerIdentity.auth_identity_id!
  )

  // 3. Obtener el Customer ID
  // Como guardaste el customer_id en 'app_metadata' en tu subscriber:
  const customerId = authIdentity.app_metadata?.customer_id as string

  if (!customerId) {
    // Fallback: Si por alguna razón no está en metadata, búscalo por email en el módulo Customer
    // (Esto es un plan B de seguridad)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)
    const [customer] = await customerModule.listCustomers({ email: decoded.email })

    if (customer) {
      req.session.customer_id = customer.id
      return res.json({ message: "Login ok (Fallback)", customer })
    }

    return res.status(500).json({ message: "Inconsistencia de datos" })
  }

  // 4. Establecer Sesión
  req.session.customer_id = customerId

  res.json({
    message: "Login exitoso",
    customer_id: customerId
  })
}
