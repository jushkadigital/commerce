import {
  createWorkflow,
  transform,
  WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import {
  updateProductsWorkflow,
  useQueryGraphStep
} from "@medusajs/medusa/core-flows"
import { updateTourStep } from "./steps/update-tour"
import { updateTourPricesStep } from "./steps/update-tour-prices"

export type UpdateTourWorkflowInput = {
  id: string
  destination?: string
  description?: string
  duration_days?: number
  max_capacity?: number
  available_dates?: string[]
  thumbnail?: string
  prices?: {
    adult?: number
    child?: number
    infant?: number
    currency_code?: string
  }
}

export const updateTourNoPriceWorkflow = createWorkflow(
  "update-tour-no-price",
  (input: UpdateTourWorkflowInput) => {
    console.log("HELLO")

    // --- Step 1: Obtener el Tour actual (para saber su product_id) ---
    const { data: tours } = useQueryGraphStep({
      entity: "tour",
      fields: ["id", "product_id"],
      filters: { id: input.id }
    })

    // Transformamos el array a objeto simple
    const tour = transform({ tours }, (data) => data.tours[0])
    console.log(tour)

    // --- Step 2: Actualizar la entidad Tour (Custom Module) ---
    const updatedTour = updateTourStep({
      id: input.id,
      data: {
        destination: input.destination,
        description: input.description,
        duration_days: input.duration_days,
        max_capacity: input.max_capacity,
        available_dates: input.available_dates,
        thumbnail: input.thumbnail
      }
    })

    // --- Step 3: Sincronizar Producto de Medusa ---
    // Si cambia el destino, duración o descripción, actualizamos el producto
    const productUpdateInput = transform(
      { input, tour },
      (data) => {
        // Si el tour no tiene producto linkeado o no hay cambios visuales, no hacemos nada
        if (!data.tour.product_id) return []

        const updateData: any = { id: data.tour.product_id }
        let hasUpdates = false

        if (data.input.destination || data.input.duration_days) {
          // Reconstruimos el título: "Cusco - 5 Days"
          const dest = data.input.destination || "Tour" // Fallback si no viene en input (raro en update parcial, pero seguro)
          const dur = data.input.duration_days || "X"

          // Nota: Si es un PATCH parcial y solo viene destination, duration_days puede ser undefined.
          // Idealmente deberíamos leer el dato actual del tour si quisiéramos ser perfectos, 
          // pero aquí actualizamos solo si vienen los datos.
          if (data.input.destination) {
            updateData.title = `${data.input.destination} ${data.input.duration_days ? `- ${data.input.duration_days} Days` : ''}`
            hasUpdates = true
          }
        }

        if (data.input.description) {
          updateData.description = data.input.description
          hasUpdates = true
        }


        return hasUpdates ? [updateData] : []
      }
    )

    // Ejecutamos el workflow core de Medusa solo si hay array
    updateProductsWorkflow.runAsStep({
      input: {
        products: productUpdateInput
      }
    })


    // --- Step 4: Actualizar Precios (Usando tu lógica custom) ---


    // --- Step 5: Retornar Tour actualizado ---
    const { data: finalTour } = useQueryGraphStep({
      entity: "tour",
      fields: [
        "id",
        "destination",
        "description",
        "duration_days",
        "max_capacity",
        "available_dates",
        "thumbnail",
        "product_id"
      ],
      filters: { id: input.id }
    }).config({ name: "retrieve-updated-tour" })

    return new WorkflowResponse({
      tour: finalTour[0]
    })
  }
)


