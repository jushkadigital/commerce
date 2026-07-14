import { TOUR_MODULE } from "../modules/tour"
import TourModuleService from "../modules/tour/service"
import { Modules } from "@medusajs/framework/utils"

export default async function checkTours({ container }) {
  const tourService: TourModuleService = container.resolve(TOUR_MODULE)
  const productService = container.resolve(Modules.PRODUCT)

  const tours = await tourService.listTours({}, {
    relations: ["variants", "bookings"],
  })


  for (const tour of tours) {
  }

  // Verificar productos
  const products = await productService.listProducts({})

  for (const product of products) {
  }

}
