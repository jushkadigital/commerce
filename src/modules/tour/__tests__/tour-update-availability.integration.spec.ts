import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { TOUR_MODULE } from ".."
import TourModuleService from "../service"
import Tour from "../models/tour"
import TourVariant from "../models/tour-variant"
import TourBooking from "../models/tour-booking"
import TourServiceVariant from "../models/tour-service-variant"

moduleIntegrationTestRunner<TourModuleService>({
  moduleName: TOUR_MODULE,
  moduleModels: [Tour, TourVariant, TourBooking, TourServiceVariant],
  resolve: "./src/modules/tour",
  testSuite: ({ service }) => {
    describe("Tour update availability integration", () => {
      it("persists blocked dates and blocked week days when updated as UI strings", async () => {
        const uniqueId = Date.now()

        const [tour] = await service.createTours([{
          product_id: `prod_${uniqueId}_availability`,
          slug: `tour-availability-${uniqueId}`,
          destination: "Availability Update Tour",
          description: "Testing persisted availability updates",
          duration_days: 1,
          max_capacity: 10,
          blocked_dates: [],
          blocked_week_days: [],
        }])

        const [updated] = await service.updateTours([{
          id: tour.id,
          blocked_dates: ["2026-04-08"],
          blocked_week_days: ["1", "2"],
        }])

        expect(updated.blocked_dates).toEqual(["2026-04-08"])
        expect(updated.blocked_week_days).toEqual(["1", "2"])

        const retrieved = await service.retrieveTour(tour.id)

        expect(retrieved.blocked_dates).toEqual(["2026-04-08"])
        expect(retrieved.blocked_week_days).toEqual(["1", "2"])
      })
    })
  },
})
