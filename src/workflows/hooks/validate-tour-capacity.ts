import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../modules/tour-booking"
import TourModuleService from "../../modules/tour-booking/service"

/**
 * Hook para validar capacidad de tours antes de completar el checkout
 * 
 * Se ejecuta durante completeCartWorkflow y verifica que haya capacidad disponible
 * para todos los items de tour en el carrito.
 */
completeCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const query = container.resolve("query")
  const tourService: TourModuleService = container.resolve(TOUR_MODULE)

  // Obtener carrito con items y metadata
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "items.*", "items.metadata"],
    filters: {
      id: input.id,
    },
  }, {
    throwIfKeyNotFound: true,
  })

  const cartWithItems = carts[0]
  if (!cartWithItems?.items || cartWithItems.items.length === 0) {
    return
  }

  for (const item of cartWithItems.items) {
    if (!item) continue
    
    const metadata = item.metadata as {
      is_tour?: boolean
      tour_id?: string
      tour_date?: string
      total_passengers?: number
      passengers?: {
        adults?: number
        children?: number
        infants?: number
      }
    } | undefined

    // Solo validar items que son tours
    if (!metadata?.is_tour) {
      continue
    }

    // Extraer tour_id y tour_date
    const tourId = metadata.tour_id
    const tourDate = metadata.tour_date

    if (!tourId || !tourDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tour item missing required metadata (tour_id or tour_date)"
      )
    }

    // Extraer total_passengers - usar el campo directo o calcular de passengers
    let totalPassengers = metadata.total_passengers
    if (totalPassengers === undefined && metadata.passengers) {
      totalPassengers = 
        (metadata.passengers.adults || 0) +
        (metadata.passengers.children || 0) +
        (metadata.passengers.infants || 0)
    }

    if (!totalPassengers || totalPassengers <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tour item missing passenger information"
      )
    }

    // Validar disponibilidad con el servicio de tours
    const validation = await tourService.validateBooking(
      tourId,
      new Date(tourDate),
      totalPassengers
    )

    if (!validation.valid) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Tour no disponible: ${validation.reason}`
      )
    }
  }
})
