import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TourModuleService from "../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../modules/tour-booking"
import createTourWorkflow from "../../../workflows/create-tour"
import { z } from "zod"


export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const {
    data: toursBooking,
    metadata
  } = await query.graph({
    entity: "tour_booking",
    ...req.queryConfig,
  })


  console.log(toursBooking)

  res.json({
    tours_booking: toursBooking,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}
