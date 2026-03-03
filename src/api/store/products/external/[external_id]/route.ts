import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  // 1. Obtenemos el external_id de la URL (/external/123)
  const externalId = req.params.external_id

  // 2. Obtenemos el region_id de los query params (?region_id=reg_123)
  const regionId = req.query.region_id as string | undefined
  const currencyCode = req.query.currency_code as string | undefined

  // 3. Resolvemos el Query Engine de la v2
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // 4. Ejecutamos la consulta en el grafo
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "*", // Trae los campos base (id, title, handle, metadata, etc.)
      "tags.*",
      "variants.*",
      "variants.images.*",
      "variants.calculated_price.*",
      "variants.inventory_quantity", // Dependiendo de tus links, esto puede requerir el módulo de inventario
      "tour.*",
      "package.*"// Relación con tu módulo personalizado
    ],
    filters: {
      external_id: externalId,
    },
    // 5. Inyectamos el contexto para que calcule el precio correcto
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: regionId,
          currency_code: currencyCode,
        }),
      },
    }
  })

  // 6. Extraemos el primer (y único) producto
  const product = products[0]

  // 7. Manejo de error si no existe
  if (!product) {
    return res.status(404).json({ message: "Product by external not found" })
  }

  // 8. Retornamos el producto con la estructura esperada por tu frontend
  res.json({ product })
}
