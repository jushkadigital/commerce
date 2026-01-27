import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // 1. Usamos el servicio de Auth para validar (Hacemos el trabajo difícil)
  const authService = req.scope.resolve(Modules.AUTH)

  const { success, authIdentity, error } = await authService.validateCallback(
    "keycloak-admin", // El ID de tu provider
    {
      url: req.url,
      headers: req.headers as unknown as Record<string, string>,
      query: req.query,
      protocol: req.protocol,
    }
  )

  if (!success || !authIdentity) {
    return res.status(401).send(`Error de Autenticación: ${error}`)
  }

  // 2. Generamos el Token manualmente (Copiamos lo que hace el nativo)
  const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http
  const userId = authIdentity.app_metadata?.user_id

  // Validación de seguridad por si el subscriber falló
  if (!userId) {
    return res.status(403).send("Error: Usuario autenticado pero no vinculado en Medusa.")
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

  // 3. EL CAMBIO CLAVE: REDIRECCIÓN
  // En lugar de `res.json({ token })`, hacemos esto:

  // Opción A: Mandar al login para que el Widget capture el token
  const redirectUrl = `/app/login?access_token=${token}`

  // Opción B: Si quieres intentar fijar la cookie directo (Avanzado, a veces falla por CORS)
  // return res.cookie('jwt', token).redirect('/app/orders')

  return res.redirect(redirectUrl)
}
