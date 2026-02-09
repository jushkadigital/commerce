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
    describe("PackageModuleService Integration Tests", () => {
      describe("CRUD operations with new fields", () => {
        it("should create package with all new fields", async () => {
          const availableDateStr = "2026-06-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_001",
            destination: "Machu Picchu",
            duration_days: 3,
            max_capacity: 10,
            is_special: true,
            blocked_dates: ["2026-12-25", "2026-12-31"],
            blocked_week_days: [0, 6],
            cancellation_deadline_hours: 48,
            booking_min_months_ahead: 3
          })
          
          expect(pkg.is_special).toBe(true)
          expect(pkg.blocked_dates).toContain("2026-12-25")
          expect(pkg.blocked_dates).toContain("2026-12-31")
          expect(pkg.blocked_week_days.map(Number)).toContain(0)
          expect(pkg.blocked_week_days.map(Number)).toContain(6)
          expect(pkg.cancellation_deadline_hours).toBe(48)
          expect(pkg.booking_min_months_ahead).toBe(3)
          expect(pkg.destination).toBe("Machu Picchu")
          expect(pkg.duration_days).toBe(3)
          expect(pkg.max_capacity).toBe(10)
        })

        it("should update package with new fields", async () => {
          const availableDateStr = "2026-06-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_002",
            destination: "Test Package",
            duration_days: 2,
            max_capacity: 5,
            is_special: false,
            blocked_dates: [],
            blocked_week_days: [],
            cancellation_deadline_hours: 12,
            booking_min_months_ahead: 2
          })

          const updated = await service.updatePackages({
            selector: { id: pkg.id },
            data: {
              is_special: true,
              blocked_dates: ["2026-12-25"],
              blocked_week_days: [0],
              cancellation_deadline_hours: 72,
              booking_min_months_ahead: 4
            }
          })

          expect(updated[0].is_special).toBe(true)
          expect(updated[0].blocked_dates).toContain("2026-12-25")
          expect(updated[0].blocked_week_days.map(Number)).toContain(0)
          expect(updated[0].cancellation_deadline_hours).toBe(72)
          expect(updated[0].booking_min_months_ahead).toBe(4)
        })

        it("should retrieve package with all new fields", async () => {
          const availableDateStr = "2026-07-20T00:00:00.000Z"
          
          const created = await service.createPackages({
            product_id: "prod_test_003",
            destination: "Retrieval Test",
            duration_days: 4,
            max_capacity: 15,
            is_special: true,
            blocked_dates: ["2026-12-25"],
            blocked_week_days: [0, 6],
            cancellation_deadline_hours: 48,
            booking_min_months_ahead: 3
          })

          const retrieved = await service.retrievePackage(created.id)

          expect(retrieved.is_special).toBe(true)
          expect(retrieved.blocked_dates).toEqual(["2026-12-25"])
          expect(retrieved.blocked_week_days.map(Number)).toEqual([0, 6])
          expect(retrieved.cancellation_deadline_hours).toBe(48)
          expect(retrieved.booking_min_months_ahead).toBe(3)
        })

        it("should list packages and filter by new fields", async () => {
          const availableDateStr = "2026-08-01T00:00:00.000Z"
          
          await service.createPackages({
            product_id: "prod_test_004",
            destination: "Special Package",
            duration_days: 2,
            max_capacity: 8,
            is_special: true
          })

          await service.createPackages({
            product_id: "prod_test_005",
            destination: "Regular Package",
            duration_days: 3,
            max_capacity: 10,
            is_special: false
          })

          const specialPackages = await service.listPackages({
            is_special: true
          })

          expect(specialPackages).toHaveLength(1)
          expect(specialPackages[0].destination).toBe("Special Package")
          expect(specialPackages[0].is_special).toBe(true)
        })
      })
      
      describe("Default values", () => {
        it("should apply default values for new fields when not specified", async () => {
          const availableDateStr = "2026-09-01T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_006",
            destination: "Defaults Test",
            duration_days: 2,
            max_capacity: 5,
          })
          
          expect(pkg.is_special).toBe(false)
          expect(pkg.blocked_dates).toEqual([])
          expect(pkg.blocked_week_days).toEqual([])
          expect(pkg.cancellation_deadline_hours).toBe(12)
          expect(pkg.booking_min_months_ahead).toBe(2)
        })

        it("should apply default booking_min_months_ahead of 2 months", async () => {
          const availableDateStr = "2026-10-01T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_007",
            destination: "Months Default Test",
            duration_days: 2,
            max_capacity: 5,
          })
          
          expect(pkg.booking_min_months_ahead).toBe(2)
        })
      })
      
      describe("Booking window validation", () => {
        it("should validate booking within available dates", async () => {
          const availableDateStr = "2026-12-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_008",
            destination: "Booking Window Test",
            duration_days: 2,
            max_capacity: 10,
          })

          const result = await service.validateBooking(pkg.id, availableDate, 2)

          expect(result.valid).toBe(true)
        })

          const availableDateStr = "2026-12-15T00:00:00.000Z"
          const unavailableDate = new Date("2026-12-20T00:00:00.000Z")
          
          const pkg = await service.createPackages({
            product_id: "prod_test_009",
            destination: "Unavailable Date Test",
            duration_days: 2,
            max_capacity: 10,
          })

          const result = await service.validateBooking(pkg.id, unavailableDate, 2)

          expect(result.valid).toBe(false)
          expect(result.reason).toBe("Package is not available on the requested date")
        })

        it("should reject booking for past dates", async () => {
          const pastDate = new Date("2020-01-01T00:00:00.000Z")
          const availableDateStr = "2026-12-15T00:00:00.000Z"
          const pastDateStr = "2020-01-01T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_010",
            destination: "Past Date Test",
            duration_days: 2,
            max_capacity: 10,
          })

          const result = await service.validateBooking(pkg.id, pastDate, 2)

          expect(result.valid).toBe(false)
          expect(result.reason).toBe("Cannot book packages for past dates")
        })

        it("should validate dates correctly when exact match", async () => {
          const availableDateStr = "2026-06-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_011",
            destination: "Time Component Test",
            duration_days: 2,
            max_capacity: 10,
          })

          const requestedDate = new Date(availableDateStr)
          const result = await service.validateBooking(pkg.id, requestedDate, 1)

          expect(result.valid).toBe(true)
        })

        it("should verify booking_min_months_ahead field exists and has default", async () => {
          const availableDateStr = "2026-12-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_012",
            destination: "Months Field Verification",
            duration_days: 2,
            max_capacity: 10,
          })

          expect(pkg.booking_min_months_ahead).toBeDefined()
          expect(pkg.booking_min_months_ahead).toBe(2)
          
          const retrieved = await service.retrievePackage(pkg.id)
          expect(retrieved).toHaveProperty("booking_min_months_ahead")
          expect(retrieved).not.toHaveProperty("booking_min_days_ahead")
        })
      })
      
      describe("Capacity validation", () => {
        it("should return full capacity when no bookings exist", async () => {
          const availableDateStr = "2026-07-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_013",
            destination: "Capacity Test",
            duration_days: 2,
            max_capacity: 10,
          })

          const capacity = await service.getAvailableCapacity(pkg.id, availableDate)

          expect(capacity).toBe(10)
        })

        it("should validate booking within capacity", async () => {
          const availableDateStr = "2026-08-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_014",
            destination: "Capacity Validation Test",
            duration_days: 2,
            max_capacity: 10,
          })

          const result = await service.validateBooking(pkg.id, availableDate, 5)

          expect(result.valid).toBe(true)
        })

        it("should reject booking when exceeding capacity", async () => {
          const availableDateStr = "2026-09-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_015",
            destination: "Over Capacity Test",
            duration_days: 2,
            max_capacity: 5,
          })

          await service.createPackageBookings([
            {
              package: pkg.id,
              order_id: "order_1",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_2",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_3",
              package_date: availableDate,
              status: "pending"
            }
          ])

          const result = await service.validateBooking(pkg.id, availableDate, 4)

          expect(result.valid).toBe(false)
          expect(result.reason).toBe("Only 2 spots available")
        })

        it("should accept booking at exact capacity limit", async () => {
          const availableDateStr = "2026-10-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_016",
            destination: "Exact Capacity Test",
            duration_days: 2,
            max_capacity: 5,
          })

          await service.createPackageBookings([
            {
              package: pkg.id,
              order_id: "order_1",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_2",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_3",
              package_date: availableDate,
              status: "confirmed"
            }
          ])

          const result = await service.validateBooking(pkg.id, availableDate, 2)

          expect(result.valid).toBe(true)
        })

        it("should calculate available capacity correctly with existing bookings", async () => {
          const availableDateStr = "2026-11-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_017",
            destination: "Available Capacity Calculation",
            duration_days: 2,
            max_capacity: 10,
          })

          await service.createPackageBookings([
            {
              package: pkg.id,
              order_id: "order_1",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_2",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_3",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_4",
              package_date: availableDate,
              status: "pending"
            }
          ])

          const capacity = await service.getAvailableCapacity(pkg.id, availableDate)

          expect(capacity).toBe(6)
        })

        it("should not count cancelled bookings towards capacity", async () => {
          const availableDateStr = "2026-12-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_018",
            destination: "Cancelled Bookings Test",
            duration_days: 2,
            max_capacity: 10,
          })

          await service.createPackageBookings([
            {
              package: pkg.id,
              order_id: "order_1",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_2",
              package_date: availableDate,
              status: "pending"
            },
            {
              package: pkg.id,
              order_id: "order_3",
              package_date: availableDate,
              status: "cancelled"
            },
            {
              package: pkg.id,
              order_id: "order_4",
              package_date: availableDate,
              status: "completed"
            }
          ])

          const capacity = await service.getAvailableCapacity(pkg.id, availableDate)

          expect(capacity).toBe(8)
        })

        it("should return zero capacity when fully booked", async () => {
          const availableDateStr = "2027-01-15T00:00:00.000Z"
          const availableDate = new Date(availableDateStr)
          
          const pkg = await service.createPackages({
            product_id: "prod_test_019",
            destination: "Fully Booked Test",
            duration_days: 2,
            max_capacity: 3,
          })

          await service.createPackageBookings([
            {
              package: pkg.id,
              order_id: "order_1",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_2",
              package_date: availableDate,
              status: "confirmed"
            },
            {
              package: pkg.id,
              order_id: "order_3",
              package_date: availableDate,
              status: "confirmed"
            }
          ])

          const capacity = await service.getAvailableCapacity(pkg.id, availableDate)

          expect(capacity).toBe(0)

          const result = await service.validateBooking(pkg.id, availableDate, 1)
          expect(result.valid).toBe(false)
          expect(result.reason).toBe("Only 0 spots available")
        })
      })
      
      describe("Blocked dates and week days storage", () => {
        it("should store and retrieve blocked_dates correctly", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_020",
            destination: "Blocked Dates Test",
            duration_days: 2,
            max_capacity: 10,
            blocked_dates: ["2026-12-25", "2026-12-31", "2027-01-01"]
          })

          const retrieved = await service.retrievePackage(pkg.id)
          
          expect(retrieved.blocked_dates).toHaveLength(3)
          expect(retrieved.blocked_dates).toContain("2026-12-25")
          expect(retrieved.blocked_dates).toContain("2026-12-31")
          expect(retrieved.blocked_dates).toContain("2027-01-01")
        })

        it("should store and retrieve blocked_week_days correctly", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_021",
            destination: "Blocked Week Days Test",
            duration_days: 2,
            max_capacity: 10,
            blocked_week_days: [0, 6]
          })

          const retrieved = await service.retrievePackage(pkg.id)
          
          expect(retrieved.blocked_week_days).toHaveLength(2)
          expect(retrieved.blocked_week_days.map(Number)).toContain(0)
          expect(retrieved.blocked_week_days.map(Number)).toContain(6)
        })

        it("should handle empty blocked_dates and blocked_week_days arrays", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_022",
            destination: "Empty Blocked Test",
            duration_days: 2,
            max_capacity: 10,
            blocked_dates: [],
            blocked_week_days: []
          })

          const retrieved = await service.retrievePackage(pkg.id)
          
          expect(retrieved.blocked_dates).toEqual([])
          expect(retrieved.blocked_week_days).toEqual([])
        })

        it("should update blocked_dates and blocked_week_days", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_023",
            destination: "Update Blocked Test",
            duration_days: 2,
            max_capacity: 10,
            blocked_dates: ["2026-12-25"],
            blocked_week_days: [0]
          })

          const updated = await service.updatePackages({
            selector: { id: pkg.id },
            data: {
              blocked_dates: ["2026-12-25", "2026-12-31", "2027-01-01"],
              blocked_week_days: [0, 6]
            }
          })

          expect(updated[0].blocked_dates).toHaveLength(3)
          expect(updated[0].blocked_week_days).toHaveLength(2)
          expect(updated[0].blocked_week_days.map(Number)).toContain(6)
        })
      })

      describe("Special package flag", () => {
        it("should identify special packages correctly", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const specialPkg = await service.createPackages({
            product_id: "prod_test_024",
            destination: "Special Package",
            duration_days: 2,
            max_capacity: 10,
            is_special: true
          })

          const regularPkg = await service.createPackages({
            product_id: "prod_test_025",
            destination: "Regular Package",
            duration_days: 2,
            max_capacity: 10,
            is_special: false
          })

          expect(specialPkg.is_special).toBe(true)
          expect(regularPkg.is_special).toBe(false)

          const allPackages = await service.listPackages()
          const specialCount = allPackages.filter((p: any) => p.is_special).length
          
          expect(specialCount).toBeGreaterThanOrEqual(1)
        })
      })

      describe("Cancellation deadline hours", () => {
        it("should store different cancellation_deadline_hours values", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg12h = await service.createPackages({
            product_id: "prod_test_026",
            destination: "12h Cancellation",
            duration_days: 2,
            max_capacity: 10,
            cancellation_deadline_hours: 12
          })

          const pkg24h = await service.createPackages({
            product_id: "prod_test_027",
            destination: "24h Cancellation",
            duration_days: 2,
            max_capacity: 10,
            cancellation_deadline_hours: 24
          })

          const pkg48h = await service.createPackages({
            product_id: "prod_test_028",
            destination: "48h Cancellation",
            duration_days: 2,
            max_capacity: 10,
            cancellation_deadline_hours: 48
          })

          expect(pkg12h.cancellation_deadline_hours).toBe(12)
          expect(pkg24h.cancellation_deadline_hours).toBe(24)
          expect(pkg48h.cancellation_deadline_hours).toBe(48)
        })
      })

      describe("Key difference: Package uses months not days", () => {
        it("should verify Package uses booking_min_months_ahead (months)", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg = await service.createPackages({
            product_id: "prod_test_029",
            destination: "Months vs Days Verification",
            duration_days: 2,
            max_capacity: 10,
          })

          expect(pkg).toHaveProperty("booking_min_months_ahead")
          expect(pkg.booking_min_months_ahead).toBe(2)
          expect(pkg).not.toHaveProperty("booking_min_days_ahead")
        })

        it("should allow setting booking_min_months_ahead to various values", async () => {
          const availableDateStr = "2026-05-15T00:00:00.000Z"
          
          const pkg1Month = await service.createPackages({
            product_id: "prod_test_030",
            destination: "1 Month Ahead",
            duration_days: 2,
            max_capacity: 10,
            booking_min_months_ahead: 1
          })

          const pkg6Months = await service.createPackages({
            product_id: "prod_test_031",
            destination: "6 Months Ahead",
            duration_days: 2,
            max_capacity: 10,
            booking_min_months_ahead: 6
          })

          const pkg12Months = await service.createPackages({
            product_id: "prod_test_032",
            destination: "12 Months Ahead",
            duration_days: 2,
            max_capacity: 10,
            booking_min_months_ahead: 12
          })

          expect(pkg1Month.booking_min_months_ahead).toBe(1)
          expect(pkg6Months.booking_min_months_ahead).toBe(6)
          expect(pkg12Months.booking_min_months_ahead).toBe(12)
        })
      })
    })

jest.setTimeout(60 * 1000)
  }
})
