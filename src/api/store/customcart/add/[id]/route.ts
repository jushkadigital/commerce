import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { z } from "zod"
import { addTourCartWorkflow } from "../../../../../workflows/create-cart";

// Esquema de validación para los datos que vienen del Modal
const CartSchema = z.object({
  items: z.array(z.object({
    variant_id: z.string(),
    quantity: z.number(),
    metadata: z.record(z.any()).optional(),
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
      message: "Se requiere cart_id y un array de items"
    });
  }

  // 2. Ejecutamos el Workflow
  const { result, errors } = await addTourCartWorkflow(req.scope).run({
    input: {
      cart_id: id,
      items: items // <--- Aquí pasas el array completo directamentte
    },
    // Si necesitas lanzar error si algo falla dentro del workflow:
    throwOnError: true
  });

  // 3. Manejo de errores del workflow

  // 4. Retornamos el carrito actualizado (que es lo que devuelve este workflow usualmente)
  res.json({ cart: result });
}
