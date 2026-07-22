import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { TOUR_MODULE } from "../../modules/tour"
import TourModuleService from "../../modules/tour/service"
import { PACKAGE_MODULE } from "../../modules/package"
import PackageModuleService from "../../modules/package/service"

/**
 * Hook para validar capacidad de tours y paquetes antes de completar el checkout.
 *
 * Medusa solo permite un handler por hook, por lo que este archivo valida ambos
 * (tours y packages) en un solo handler. Hace un único fetch del carrito y luego
 * itera los items validando según is_tour o is_package.
 */
completeCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const query = container.resolve("query")
  const tourService: TourModuleService = container.resolve(TOUR_MODULE)
  const packageService: PackageModuleService = container.resolve(PACKAGE_MODULE)

  // Obtener carrito con items y metadata (un solo fetch para tours y packages)
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
      is_package?: boolean
      tour_id?: string
      tour_date?: string
      package_id?: string
      package_date?: string
      total_passengers?: number
      passengers?: {
        adults?: number
        children?: number
        infants?: number
      }
    } | undefined

    // Extraer total_passengers - usar el campo directo o calcular de passengers
    let totalPassengers = metadata?.total_passengers
    if (totalPassengers === undefined && metadata?.passengers) {
      totalPassengers =
        (metadata.passengers.adults || 0) +
        (metadata.passengers.children || 0) +
        (metadata.passengers.infants || 0)
    }

    // Validar items que son tours
    if (metadata?.is_tour) {
      const tourId = metadata.tour_id
      const tourDate = metadata.tour_date

      if (!tourId || !tourDate) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Tour item missing required metadata (tour_id or tour_date)"
        )
      }

      if (!totalPassengers || totalPassengers <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Tour item missing passenger information"
        )
      }

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

    // Validar items que son paquetes
    if (metadata?.is_package) {
      const packageId = metadata.package_id
      const packageDate = metadata.package_date

      if (!packageId || !packageDate) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Package item missing required metadata (package_id or package_date)"
        )
      }

      if (!totalPassengers || totalPassengers <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Package item missing passenger information"
        )
      }

      const validation = await packageService.validateBooking(
        packageId,
        new Date(packageDate),
        totalPassengers
      )

      if (!validation.valid) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Package no disponible: ${validation.reason}`
        )
      }
    }
  }
})
