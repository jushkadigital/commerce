import { TOUR_MODULE } from "../modules/tour-booking"
import TourModuleService from "../modules/tour-booking/service"
import { Modules } from "@medusajs/framework/utils"

export default async function checkTours({ container }) {
  const tourService: TourModuleService = container.resolve(TOUR_MODULE)
  const productService = container.resolve(Modules.PRODUCT)

  const tours = await tourService.listTours({}, {
    relations: ["variants", "bookings"],
  })

  console.log("\n=== TOURS EN BASE DE DATOS ===")
  console.log(`Total: ${tours.length}`)

  for (const tour of tours) {
    console.log(`\n- ID: ${tour.id}`)
    console.log(`  Destino: ${tour.destination}`)
    console.log(`  Product ID: ${tour.product_id || "SIN PRODUCTO"}`)
    console.log(`  Duración: ${tour.duration_days} días`)
    console.log(`  Capacidad: ${tour.max_capacity}`)
    console.log(`  Fechas disponibles: ${tour.available_dates?.length || 0}`)
    console.log(`  Variantes: ${tour.variants?.length || 0}`)
  }

  // Verificar productos
  const products = await productService.listProducts({})
  console.log("\n=== PRODUCTOS EN MEDUSA ===")
  console.log(`Total: ${products.length}`)

  for (const product of products) {
    console.log(`\n- ID: ${product.id}`)
    console.log(`  Título: ${product.title}`)
  }

  console.log("\n")
}
