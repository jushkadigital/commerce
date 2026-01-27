import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { provider } = req.params
  const service = req.scope.resolve(Modules.AUTH)

  const result = await service.authenticate(provider, {
    url: req.url,
    headers: req.headers as unknown as Record<string, string>,
    query: req.query as unknown as Record<string, string>,
    protocol: req.protocol,
  })

  if (result.success && result.location) {
    return res.json({ location: result.location })
  }

  return res.status(401).json({ message: "Could not initiate login" })
}
