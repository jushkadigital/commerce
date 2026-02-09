import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import TourModuleService from "../../modules/tour/service"
import PackageModuleService from "../../modules/package/service"
import { TOUR_MODULE } from "../../modules/tour"
import { PACKAGE_MODULE } from "../../modules/package"

export type ValidateCapacityStepInput = {
  entity_id: string
  entity_type: "tour" | "package"
  booking_date: Date
  passengers: {
    adult: number
    child: number
    infant: number
  }
}

export type ValidateCapacityStepOutput = {
  remaining_capacity: number
}

export const validateCapacityStep = createStep(
  "validate-capacity",
  async (input: ValidateCapacityStepInput, { container }): Promise<StepResponse<ValidateCapacityStepOutput>> => {
    const { entity_id, entity_type, booking_date, passengers } = input

    const newPassengers = passengers.adult + passengers.child

    let maxCapacity: number
    let existingPassengers = 0

    if (entity_type === "tour") {
      const tourService: TourModuleService = container.resolve(TOUR_MODULE)
      
      const tour = await tourService.retrieveTour(entity_id)
      maxCapacity = tour.max_capacity

      const bookings = await tourService.listTourBookings({
        tour_id: entity_id,
        tour_date: booking_date,
        status: ["confirmed", "pending"],
      })

      for (const booking of bookings) {
        if (booking.line_items) {
          const lineItems = booking.line_items as unknown as Array<{
            passengers?: {
              adults?: number
              children?: number
              infants?: number
            }
          }>
          
          for (const item of lineItems) {
            if (item.passengers) {
              existingPassengers += (item.passengers.adults || 0) + (item.passengers.children || 0)
            }
          }
        }
      }
    } else {
      const packageService: PackageModuleService = container.resolve(PACKAGE_MODULE)
      
      const pkg = await packageService.retrievePackage(entity_id)
      maxCapacity = pkg.max_capacity

      const bookings = await packageService.listPackageBookings({
        package_id: entity_id,
        package_date: booking_date,
        status: ["confirmed", "pending"],
      })

      for (const booking of bookings) {
        if (booking.line_items) {
          const lineItems = booking.line_items as unknown as Array<{
            passengers?: {
              adults?: number
              children?: number
              infants?: number
            }
          }>
          
          for (const item of lineItems) {
            if (item.passengers) {
              existingPassengers += (item.passengers.adults || 0) + (item.passengers.children || 0)
            }
          }
        }
      }
    }

    const totalPassengers = existingPassengers + newPassengers
    const remainingCapacity = maxCapacity - totalPassengers

    if (totalPassengers > maxCapacity) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Capacity exceeded for ${entity_type} on ${booking_date.toISOString().split('T')[0]}. ` +
        `Maximum capacity: ${maxCapacity}, requested: ${newPassengers}, already booked: ${existingPassengers}. ` +
        `Only ${maxCapacity - existingPassengers} spots available.`
      )
    }

    return new StepResponse({ remaining_capacity: remainingCapacity })
  }
)
