import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { z } from "zod"
import { addTourCartWorkflow } from "../../../../../workflows/create-cart";
import { deleteLineItemsWorkflow } from "@medusajs/medusa/core-flows"

import { MedusaError } from "@medusajs/framework/utils";

// Esquema de validación para los datos que vienen del Modal
const CartSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
  }))
})

type CartSchemaType = z.infer<typeof CartSchema>
export async function POST(req: MedusaRequest<CartSchemaType>, res: MedusaResponse) {

  const { id } = req.params
  const { items } = req.body;

  console.log(items)
  // Validación básica (opcional pero recomendada)
  if (!id || !items || !Array.isArray(items)) {
    return res.status(400).json({
      message: "Se requiere array cart_id"
    });
  }
  console.log("GEEE")

  const { result, errors } = await deleteLineItemsWorkflow(req.scope)
    .run({
      input: {
        cart_id: id,
        ids: items.map(ele => ele.id)
      }
    })

  console.log(result)
  console.log("GAA")
  if (errors.length > 0) {
    throw new MedusaError("warn", "ERRORRr")
  }
  // 2. Ejecutamos el Workflow

  // 3. Manejo de errores del workflow

  // 4. Retornamos el carrito actualizado (que es lo que devuelve este workflow usualmente)
  return res.json({ cart: result });
}
