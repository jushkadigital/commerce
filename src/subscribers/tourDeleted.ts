import { Modules } from "@medusajs/framework/utils"
import { SubscriberConfig, SubscriberArgs } from "@medusajs/medusa"
import { TOUR_MODULE } from "../modules/tour"
import type TourModuleService from "../modules/tour/service"
import { EVENTS_MODULE } from "../modules/events"
import type EventModuleService from "../modules/events/service"

type TourDeletedEvent = {
  id?: string
  payloadId?: string
}

export default async function handleTourDeletedSync({
  event,
  container
}: SubscriberArgs<TourDeletedEvent>) {

  try {
    const tourModule = container.resolve<TourModuleService>(TOUR_MODULE)
    const productModule = container.resolve(Modules.PRODUCT)

    const externalId = event.data?.id || event.data?.payloadId

    if (!externalId) {
      return
    }

    const [matchedTour] = await tourModule.getTourByMetadata(`${externalId}tour`)

    if (!matchedTour) {
      return
    }

    const tour = await tourModule.retrieveTour(matchedTour.id, {
      relations: ["variants", "bookings", "service_variants"],
    })

    if (tour.variants?.length) {
      await tourModule.deleteTourVariants(tour.variants.map((variant) => variant.id))
    }

    if (tour.bookings?.length) {
      await tourModule.deleteTourBookings(tour.bookings.map((booking) => booking.id))
    }

    if (tour.service_variants?.length) {
      await tourModule.deleteTourServiceVariants(
        tour.service_variants.map((serviceVariant) => serviceVariant.id)
      )
    }

    await tourModule.deleteTours([tour.id])

    if (tour.product_id) {
      try {
        await productModule.deleteProducts([tour.product_id])
      } catch (productError) {
      }
    }

    try {
      const eventModuleService = container.resolve(EVENTS_MODULE) as EventModuleService
      await eventModuleService.publishEvent({
        type: "integration",
        aggregateType: "tour",
        action: "deleted",
        version: 1,
        payload: {
          id: tour.id,
          productId: tour.product_id,
        },
        causationId: `medusa:tour.deleted:${externalId}`,
      })
    } catch (edaError) {
    }
  } catch (error) {
  }
}

export const config: SubscriberConfig = {
  event: "integration.tour.deleted.v1",
}