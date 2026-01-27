import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { provider } = req.params

  console.log(`[SSO Callback] Procesando callback para: ${provider}`)
  console.log(`[SSO Callback] Params recibidos:`, req.query)

  try {
    const authService = req.scope.resolve(Modules.AUTH)
    const configModule = req.scope.resolve("configModule")

    // --- CORRECCIÓN CRÍTICA AQUÍ ---
    // Usamos validateCallback, que es el método que procesa el 'code'
    // y devuelve la identidad del usuario.
    const { success, authIdentity, error } = await authService.validateCallback(
      provider,
      {
        url: req.url,
        headers: req.headers as unknown as Record<string, string>,
        query: req.query,
        protocol: req.protocol,
      }
    )

    if (!success || !authIdentity) {
      console.error("[SSO Callback] Falló validación:", error)
      return res.status(401).json({ message: error || "Authentication failed" })
    }

    // Si llegamos aquí, ¡ya tenemos la identidad!
    console.log(`[SSO Callback] Éxito. Identity ID: ${authIdentity.id}`)


    // Generar Token Manualmente
    const { jwtSecret } = configModule.projectConfig.http
    const token = jwt.sign(
      { auth_identity_id: authIdentity.id },
      jwtSecret,
      { expiresIn: "1h" }
    )

    return res.status(200).json({ token })

  } catch (error) {
    console.error("[SSO Callback] Error interno:", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
