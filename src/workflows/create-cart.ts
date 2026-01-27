import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
  transform
} from "@medusajs/framework/workflows-sdk"
import { generateEntityId } from "@medusajs/utils"
import { addToCartWorkflow } from "@medusajs/core-flows"

// --- TYPE DEFINITIONS ---
type TourItemInput = {
  variant_id: string
  quantity: number
  metadata?: Record<string, any> // Metadata específica del pasajero (ej. nombre)
}

type AddTourWorkflowInput = {
  cart_id: string
  items: TourItemInput[]
}

// --- STEP 1: PREPARAR DATOS Y GENERAR GROUP ID ---
const prepareTourItemsStep = createStep(
  "prepare-tour-items-step",
  async (input: { items: TourItemInput[] }, { container }) => {

    const logger = container.resolve("logger")

    // 2. Usar el logger de Medusa
    logger.info("--> ESTOY EN EL STEP")

    // 1. Generamos el ID Único de Grupo (El "Pegamento")
    // Usamos 'tour' como prefijo para que el ID sea tipo: tour_01J9...
    const groupId = generateEntityId(undefined, "tour")
    console.log(groupId)
    const tourData = transform({ input }, (data) => {
      return data.input.items.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        metadata: {
          ...item.metadata,       // Datos del Pasajero
          group_id: groupId,      // <--- AQUÍ ESTÁ LA MAGIA
          is_tour: true
        }
      }))
    })
    // 2. Transformamos los items para inyectarles el ID
    const lineItems = input.items.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      metadata: {
        ...item.metadata,       // Datos del Pasajero
        group_id: groupId,      // <--- AQUÍ ESTÁ LA MAGIA
        is_tour: true
      }
    }))

    // Retornamos los items listos y el groupId por si queremos devolverlo al front
    return new StepResponse({ tourData, groupId })
  }
)

// --- MAIN WORKFLOW ---
export const addTourCartWorkflow = createWorkflow(
  "add-tour-cart-workflow",
  function (input: AddTourWorkflowInput) {

    // Paso 1: Generar IDs y preparar objetos
    const preparationData = prepareTourItemsStep({
      items: input.items,
    })

    // Paso 2: Usar el Workflow Nativo de Medusa para añadir al carrito
    // addToCartWorkflow soporta un array de items nativamente
    const addToCartResult = addToCartWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        items: preparationData.tourData,
      }
    })

    // Retornamos el carrito actualizado y el ID del grupo generado
    return new WorkflowResponse({
      cart: addToCartResult,
      groupId: preparationData.groupId
    })
  }
)
