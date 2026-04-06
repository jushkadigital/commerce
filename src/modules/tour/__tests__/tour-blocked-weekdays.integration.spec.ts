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
    describe("Tour blocked weekdays integration", () => {
      const getNextWeekDay = (targetDay: number): Date => {
        const candidate = new Date()
        candidate.setHours(0, 0, 0, 0)
        candidate.setDate(candidate.getDate() + 1)

        while (candidate.getDay() !== targetDay) {
          candidate.setDate(candidate.getDate() + 1)
        }

        return candidate
      }

      it("rejects booking when the requested day of week is blocked", async () => {
        const blockedSunday = getNextWeekDay(0)

        const [tour] = await service.createTours([{
          product_id: `prod_${Date.now()}_weekday`,
          slug: `blocked-sunday-tour-${Date.now()}`,
          destination: "Blocked Sunday Tour",
          description: "Testing blocked weekdays in booking validation",
          duration_days: 1,
          max_capacity: 10,
          booking_min_days_ahead: 0,
          blocked_week_days: ["0"],
        }])

        const validation = await service.validateBooking(tour.id, blockedSunday, 1)

        expect(validation.valid).toBe(false)
        expect(validation.reason).toBe("Tours no estan disponibles los Domingo")
      })
    })
  },
})
