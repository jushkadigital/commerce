import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { PACKAGE_MODULE } from ".."
import PackageModuleService from "../service"
import Package from "../models/package"
import PackageBooking from "../models/package-booking"
import PackageVariant from "../models/package-variant"
import PackageServiceVariant from "../models/package-service-variant"

moduleIntegrationTestRunner<PackageModuleService>({
  moduleName: PACKAGE_MODULE,
  moduleModels: [Package, PackageBooking, PackageVariant, PackageServiceVariant],
  resolve: "./src/modules/package",
  testSuite: ({ service }) => {
    describe("Package blocked weekdays integration", () => {
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

        const [pkg] = await service.createPackages([{
          product_id: `prod_${Date.now()}_weekday`,
          slug: `blocked-sunday-package-${Date.now()}`,
          destination: "Blocked Sunday Package",
          duration_days: 2,
          max_capacity: 10,
          booking_min_days_ahead: 0,
          blocked_week_days: ["0"],
        }])

        const validation = await service.validateBooking(pkg.id, blockedSunday, 1)

        expect(validation.valid).toBe(false)
        expect(validation.reason).toBe("Paquetes no estan disponibles los Domingo")
      })

      it("rejects booking when the requested date is below the minimum days ahead", async () => {
        const tomorrow = new Date()
        tomorrow.setHours(0, 0, 0, 0)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const [pkg] = await service.createPackages([{
          product_id: `prod_${Date.now()}_leadtime`,
          slug: `package-lead-time-${Date.now()}`,
          destination: "Lead Time Package",
          duration_days: 2,
          max_capacity: 10,
          booking_min_days_ahead: 2,
        }])

        const validation = await service.validateBooking(pkg.id, tomorrow, 1)

        expect(validation.valid).toBe(false)
        expect(validation.reason).toBe("Se deben hacer reservas al menos 2 dias en adelante")
      })
    })
  },
})
