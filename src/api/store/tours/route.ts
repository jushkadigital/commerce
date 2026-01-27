import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TourModuleService from "../../../modules/tour-booking/service"
import { TOUR_MODULE } from "../../../modules/tour-booking"
import createTourWorkflow from "../../../workflows/create-tour"
import { StoreCreateTourBodyType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")

  const {
    data: tours,
    metadata,
  } = await query.graph({
    entity: "tour",
    ...req.queryConfig,
  })

  res.json({
    tours,
    count: metadata?.count,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}

export async function POST(
  req: MedusaRequest<StoreCreateTourBodyType>,
  res: MedusaResponse
) {
  const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)

  const {
    destination,
    description,
    duration_days,
    max_capacity,
    available_dates,
    thumbnail,
    prices,
  } = req.validatedBody

  // Execute workflow to create tour with product and variants
  const { result } = await createTourWorkflow(req.scope).run({
    input: {
      destination,
      description,
      duration_days,
      max_capacity,
      available_dates,
      thumbnail,
      prices,
    },
  })

  // Retrieve created tour with pricing
  const createdTour = await tourModuleService.retrieveTour(result.tour.id, {
    relations: ["variants"],
  })
  const pricing = await tourModuleService.getTourPricing(result.tour.id)

  res.status(201).json({
    tour: {
      id: createdTour.id,
      destination: createdTour.destination,
      description: createdTour.description,
      duration_days: createdTour.duration_days,
      max_capacity: createdTour.max_capacity,
      available_dates: createdTour.available_dates,
      prices: pricing.prices,
    },
  })
}
