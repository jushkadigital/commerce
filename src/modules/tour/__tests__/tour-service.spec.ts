import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { TOUR_MODULE } from "../"
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
    describe("TourModuleService Integration Tests", () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const twoDaysFromNow = new Date(today)
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
      const threeDaysFromNow = new Date(today)
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0]
      }

      const generateProductId = () => `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      describe("CRUD Operations with New Fields", () => {
        it("should create tour with all new fields", async () => {
          const blockedDate = "2026-12-25"
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Machu Picchu",
            description: "Ancient Incan city",
            duration_days: 1,
            max_capacity: 10,
            is_special: true,
            blocked_dates: [blockedDate],
            blocked_week_days: [0, 6],
            cancellation_deadline_hours: 24,
            booking_min_days_ahead: 3
          }])

          expect(tour).toBeDefined()
          expect(tour[0].id).toBeDefined()
          expect(tour[0].destination).toBe("Machu Picchu")
          expect(tour[0].is_special).toBe(true)
          expect(tour[0].blocked_dates).toContain(blockedDate)
          expect(tour[0].blocked_week_days).toContain(0)
          expect(tour[0].blocked_week_days).toContain(6)
          expect(tour[0].cancellation_deadline_hours).toBe(24)
          expect(tour[0].booking_min_days_ahead).toBe(3)
        })

        it("should retrieve tour with new fields", async () => {
          const blockedDate = "2026-01-01"
          const created = await service.createTours([{
            product_id: generateProductId(),
            destination: "Cusco City Tour",
            description: "City exploration",
            duration_days: 1,
            max_capacity: 15,
            is_special: false,
            blocked_dates: [blockedDate],
            blocked_week_days: [0],
            cancellation_deadline_hours: 48,
            booking_min_days_ahead: 5
          }])

          const retrieved = await service.retrieveTour(created[0].id)

          expect(retrieved.is_special).toBe(false)
          expect(retrieved.blocked_dates).toContain(blockedDate)
          expect(retrieved.blocked_week_days.map(Number)).toContain(0)
          expect(retrieved.cancellation_deadline_hours).toBe(48)
          expect(retrieved.booking_min_days_ahead).toBe(5)
        })

        it("should update tour with new fields", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Sacred Valley",
            description: "Valley tour",
            duration_days: 1,
            max_capacity: 20,
            is_special: false,
            blocked_dates: [],
            blocked_week_days: [],
            cancellation_deadline_hours: 12,
            booking_min_days_ahead: 2
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            is_special: true,
            blocked_dates: ["2026-12-25", "2026-12-31"],
            blocked_week_days: [0, 6],
            cancellation_deadline_hours: 72,
            booking_min_days_ahead: 7
          }])

          expect(updated[0].is_special).toBe(true)
          expect(updated[0].blocked_dates).toContain("2026-12-25")
          expect(updated[0].blocked_dates).toContain("2026-12-31")
          expect(updated[0].blocked_week_days).toContain(0)
          expect(updated[0].blocked_week_days).toContain(6)
          expect(updated[0].cancellation_deadline_hours).toBe(72)
          expect(updated[0].booking_min_days_ahead).toBe(7)
        })

        it("should list tours with new fields", async () => {
          await service.createTours([{
            product_id: generateProductId(),
            destination: "Tour 1",
            description: "First tour",
            duration_days: 1,
            max_capacity: 10,
            is_special: true
          }])

          await service.createTours([{
            product_id: generateProductId(),
            destination: "Tour 2",
            description: "Second tour",
            duration_days: 2,
            max_capacity: 15,
            is_special: false
          }])

          const tours = await service.listTours()

          expect(tours.length).toBeGreaterThanOrEqual(2)
          
          const specialTours = tours.filter(t => t.is_special === true)
          const regularTours = tours.filter(t => t.is_special === false)
          
          expect(specialTours.length).toBeGreaterThanOrEqual(1)
          expect(regularTours.length).toBeGreaterThanOrEqual(1)
        })

        it("should delete tour and clean up", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Temporary Tour",
            description: "Will be deleted",
            duration_days: 1,
            max_capacity: 5,
          }])

          const tourId = tour[0].id
          await service.deleteTours(tourId)

          await expect(service.retrieveTour(tourId)).rejects.toThrow()
        })
      })

      describe("Default Values", () => {
        it("should apply default values for new fields when not specified", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Test Default Values",
            description: "Testing defaults",
            duration_days: 1,
            max_capacity: 10,
          }])

          expect(tour[0].is_special).toBe(false)
          expect(tour[0].blocked_dates).toEqual([])
          expect(tour[0].blocked_week_days).toEqual([])
          expect(tour[0].cancellation_deadline_hours).toBe(12)
          expect(tour[0].booking_min_days_ahead).toBe(2)
        })

        it("should apply default boolean value for is_special", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Test Boolean Default",
            duration_days: 1,
            max_capacity: 5,
          }])

          expect(tour[0].is_special).toBe(false)
          expect(typeof tour[0].is_special).toBe("boolean")
        })

        it("should apply default array values", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Test Array Defaults",
            duration_days: 1,
            max_capacity: 5,
          }])

          expect(Array.isArray(tour[0].blocked_dates)).toBe(true)
          expect(Array.isArray(tour[0].blocked_week_days)).toBe(true)
          expect(tour[0].blocked_dates.length).toBe(0)
          expect(tour[0].blocked_week_days.length).toBe(0)
        })

        it("should apply default numeric values", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Test Numeric Defaults",
            duration_days: 1,
            max_capacity: 5,
          }])

          expect(tour[0].cancellation_deadline_hours).toBe(12)
          expect(tour[0].booking_min_days_ahead).toBe(2)
          expect(typeof tour[0].cancellation_deadline_hours).toBe("number")
          expect(typeof tour[0].booking_min_days_ahead).toBe("number")
        })
      })

      describe("Booking Window Validation", () => {
        it("should validate booking at exactly 2 days ahead (minimum for tours)", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Booking Window Test",
            description: "Testing 2-day minimum",
            duration_days: 1,
            max_capacity: 10,
            booking_min_days_ahead: 2
          }])

          const validation = await service.validateBooking(
            tour[0].id,
            twoDaysFromNow,
            1
          )

          expect(validation.valid).toBe(true)
        })

        it("should validate booking more than 2 days ahead", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Future Booking Test",
            description: "Testing future booking",
            duration_days: 1,
            max_capacity: 10,
            booking_min_days_ahead: 2
          }])

          const validation = await service.validateBooking(
            tour[0].id,
            nextWeek,
            1
          )

          expect(validation.valid).toBe(true)
        })

        it("should reject booking for past dates", async () => {
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)

          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Past Date Test",
            description: "Testing past dates",
            duration_days: 1,
            max_capacity: 10,
          }])

          const validation = await service.validateBooking(
            tour[0].id,
            yesterday,
            1
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toContain("past")
        })

        it("should accept booking for today", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Today Booking Test",
            description: "Testing same-day booking",
            duration_days: 1,
            max_capacity: 10,
          }])

          const validation = await service.validateBooking(
            tour[0].id,
            today,
            1
          )

          expect(validation.valid).toBe(true)
        })

        it("should respect custom booking_min_days_ahead value", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Custom Window Test",
            description: "Testing custom 5-day minimum",
            duration_days: 1,
            max_capacity: 10,
            booking_min_days_ahead: 5
          }])

          const validation = await service.validateBooking(
            tour[0].id,
            nextWeek,
            1
          )

          expect(validation.valid).toBe(true)
          expect(tour[0].booking_min_days_ahead).toBe(5)
        })
      })

      describe("Capacity Validation", () => {
        it("should calculate full available capacity when no bookings", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Capacity Test - Empty",
            description: "Testing empty capacity",
            duration_days: 1,
            max_capacity: 10,
          }])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(10)
        })

        it("should calculate available capacity with confirmed bookings", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Capacity Test - With Bookings",
            description: "Testing capacity with bookings",
            duration_days: 1,
            max_capacity: 10,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "confirmed"
            }
          ])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(8)
        })

        it("should calculate available capacity with pending bookings", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Capacity Test - Pending",
            description: "Testing capacity with pending",
            duration_days: 1,
            max_capacity: 10,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "pending"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "pending"
            }
          ])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(8)
        })

        it("should not count cancelled bookings in capacity", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Capacity Test - Cancelled",
            description: "Testing capacity excludes cancelled",
            duration_days: 1,
            max_capacity: 10,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "cancelled"
            },
            {
              tour: tour[0].id,
              order_id: "order_3",
              tour_date: nextWeek,
              status: "pending"
            }
          ])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(8)
        })

        it("should reject booking exceeding available capacity", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Capacity Limit Test",
            description: "Testing capacity limits",
            duration_days: 1,
            max_capacity: 5,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_3",
              tour_date: nextWeek,
              status: "confirmed"
            }
          ])

          const validation = await service.validateBooking(
            tour[0].id,
            nextWeek,
            3
          )

          expect(validation.valid).toBe(false)
          expect(validation.reason).toMatch(/(Only|available|not available)/)
        })

        it("should accept booking for exactly remaining capacity", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Exact Capacity Test",
            description: "Testing exact capacity",
            duration_days: 1,
            max_capacity: 5,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "confirmed"
            }
          ])

          const validation = await service.validateBooking(
            tour[0].id,
            nextWeek,
            3
          )

          expect(validation.valid).toBe(true)
        })

        it("should return zero capacity when fully booked", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Full Capacity Test",
            description: "Testing full capacity",
            duration_days: 1,
            max_capacity: 3,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_3",
              tour_date: nextWeek,
              status: "confirmed"
            }
          ])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(0)
        })

        it("should return negative capacity when overbooked", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Overbooked Test",
            description: "Testing overbooking scenario",
            duration_days: 1,
            max_capacity: 2,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_3",
              tour_date: nextWeek,
              status: "confirmed"
            }
          ])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(-1)
        })

        it("should calculate capacity per date independently", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Multi Date Capacity Test",
            description: "Testing capacity per date",
            duration_days: 1,
            max_capacity: 10
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "confirmed"
            }
          ])

          const capacityFirstDate = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )
          const capacityOtherDate = await service.getAvailableCapacity(
            tour[0].id,
            threeDaysFromNow
          )

          expect(capacityFirstDate).toBe(8)
          expect(capacityOtherDate).toBe(10)
        })
      })

      describe("Blocked Dates Validation", () => {
        it("should create tour with blocked dates", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Blocked Dates Test",
            description: "Testing blocked dates",
            duration_days: 1,
            max_capacity: 10,
            blocked_dates: ["2026-12-25", "2026-12-31", "2027-01-01"]
          }])

          expect(tour[0].blocked_dates).toHaveLength(3)
          expect(tour[0].blocked_dates).toContain("2026-12-25")
          expect(tour[0].blocked_dates).toContain("2026-12-31")
          expect(tour[0].blocked_dates).toContain("2027-01-01")
        })

        it("should update blocked dates", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Update Blocked Dates Test",
            description: "Testing blocked dates update",
            duration_days: 1,
            max_capacity: 10,
            blocked_dates: ["2026-12-25"]
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            blocked_dates: ["2026-12-25", "2026-12-26", "2026-12-27"]
          }])

          expect(updated[0].blocked_dates).toHaveLength(3)
          expect(updated[0].blocked_dates).toContain("2026-12-27")
        })

        it("should clear blocked dates", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Clear Blocked Dates Test",
            description: "Testing clearing blocked dates",
            duration_days: 1,
            max_capacity: 10,
            blocked_dates: ["2026-12-25", "2026-12-26"]
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            blocked_dates: []
          }])

          expect(updated[0].blocked_dates).toHaveLength(0)
        })

        it("should persist blocked dates after retrieval", async () => {
          const blockedDates = ["2026-06-15", "2026-07-04", "2026-11-28"]
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Persist Blocked Dates Test",
            description: "Testing blocked dates persistence",
            duration_days: 1,
            max_capacity: 10,
            blocked_dates: blockedDates
          }])

          const retrieved = await service.retrieveTour(tour[0].id)

          expect(retrieved.blocked_dates).toHaveLength(3)
          blockedDates.forEach(date => {
            expect(retrieved.blocked_dates).toContain(date)
          })
        })
      })

      describe("Blocked Week Days Validation", () => {
        it("should create tour with blocked week days", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Blocked Week Days Test",
            description: "Testing blocked week days",
            duration_days: 1,
            max_capacity: 10,
            blocked_week_days: [0, 6]
          }])

          expect(tour[0].blocked_week_days).toHaveLength(2)
          expect(tour[0].blocked_week_days).toContain(0)
          expect(tour[0].blocked_week_days).toContain(6)
        })

        it("should create tour blocking only Sundays", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Sunday Blocked Test",
            description: "Testing Sunday only blocked",
            duration_days: 1,
            max_capacity: 10,
            blocked_week_days: [0]
          }])

          expect(tour[0].blocked_week_days).toHaveLength(1)
          expect(tour[0].blocked_week_days).toContain(0)
          expect(tour[0].blocked_week_days).not.toContain(6)
        })

        it("should update blocked week days", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Update Blocked Week Days Test",
            description: "Testing blocked week days update",
            duration_days: 1,
            max_capacity: 10,
            blocked_week_days: [0]
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            blocked_week_days: [0, 6, 1]
          }])

          expect(updated[0].blocked_week_days).toHaveLength(3)
          expect(updated[0].blocked_week_days).toContain(1)
        })

        it("should clear blocked week days", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Clear Blocked Week Days Test",
            description: "Testing clearing blocked week days",
            duration_days: 1,
            max_capacity: 10,
            blocked_week_days: [0, 6]
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            blocked_week_days: []
          }])

          expect(updated[0].blocked_week_days).toHaveLength(0)
        })

        it("should persist blocked week days after retrieval", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Persist Blocked Week Days Test",
            description: "Testing blocked week days persistence",
            duration_days: 1,
            max_capacity: 10,
            blocked_week_days: [0, 6, 3]
          }])

          const retrieved = await service.retrieveTour(tour[0].id)

          expect(retrieved.blocked_week_days).toHaveLength(3)
          expect(retrieved.blocked_week_days.map(Number)).toContain(0)
          expect(retrieved.blocked_week_days.map(Number)).toContain(3)
          expect(retrieved.blocked_week_days.map(Number)).toContain(6)
        })

        it("should handle all days blocked", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "All Days Blocked Test",
            description: "Testing all days blocked",
            duration_days: 1,
            max_capacity: 10,
            blocked_week_days: [0, 1, 2, 3, 4, 5, 6]
          }])

          expect(tour[0].blocked_week_days).toHaveLength(7)
        })
      })

      describe("Special Tour Flag (is_special)", () => {
        it("should create special tour", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Special Tour Test",
            description: "Testing special flag true",
            duration_days: 1,
            max_capacity: 10,
            is_special: true
          }])

          expect(tour[0].is_special).toBe(true)
        })

        it("should create regular tour", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Regular Tour Test",
            description: "Testing special flag false",
            duration_days: 1,
            max_capacity: 10,
            is_special: false
          }])

          expect(tour[0].is_special).toBe(false)
        })

        it("should toggle special flag", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Toggle Special Test",
            description: "Testing special flag toggle",
            duration_days: 1,
            max_capacity: 10,
            is_special: false
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            is_special: true
          }])

          expect(updated[0].is_special).toBe(true)

          const updatedAgain = await service.updateTours([{
            id: tour[0].id,
            is_special: false
          }])

          expect(updatedAgain[0].is_special).toBe(false)
        })

        it("should filter tours by is_special flag", async () => {
          await service.createTours([{
            product_id: generateProductId(),
            destination: "Special Tour Filter",
            description: "Special tour for filtering",
            duration_days: 1,
            max_capacity: 10,
            is_special: true
          }])

          await service.createTours([{
            product_id: generateProductId(),
            destination: "Regular Tour Filter",
            description: "Regular tour for filtering",
            duration_days: 1,
            max_capacity: 10,
            is_special: false
          }])

          const specialTours = await service.listTours({
            is_special: true
          })

          const regularTours = await service.listTours({
            is_special: false
          })

          expect(specialTours.length).toBeGreaterThanOrEqual(1)
          expect(regularTours.length).toBeGreaterThanOrEqual(1)
          expect(specialTours.every(t => t.is_special === true)).toBe(true)
          expect(regularTours.every(t => t.is_special === false)).toBe(true)
        })
      })

      describe("Cancellation Deadline Hours", () => {
        it("should create tour with custom cancellation deadline", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Cancellation Deadline Test",
            description: "Testing cancellation deadline",
            duration_days: 1,
            max_capacity: 10,
            cancellation_deadline_hours: 72
          }])

          expect(tour[0].cancellation_deadline_hours).toBe(72)
        })

        it("should update cancellation deadline hours", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Update Cancellation Deadline Test",
            description: "Testing cancellation deadline update",
            duration_days: 1,
            max_capacity: 10,
            cancellation_deadline_hours: 12
          }])

          const updated = await service.updateTours([{
            id: tour[0].id,
            cancellation_deadline_hours: 48
          }])

          expect(updated[0].cancellation_deadline_hours).toBe(48)
        })

        it("should persist cancellation deadline after retrieval", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Persist Cancellation Deadline Test",
            description: "Testing cancellation deadline persistence",
            duration_days: 1,
            max_capacity: 10,
            cancellation_deadline_hours: 24
          }])

          const retrieved = await service.retrieveTour(tour[0].id)

          expect(retrieved.cancellation_deadline_hours).toBe(24)
        })
      })

      describe("Integration with Bookings", () => {
        it("should create booking linked to tour", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Booking Integration Test",
            description: "Testing booking creation",
            duration_days: 1,
            max_capacity: 10,
          }])

          const booking = await service.createTourBookings([{
            tour: tour[0].id,
            order_id: "test_order_123",
            tour_date: nextWeek,
            status: "pending"
          }])

          expect(booking).toBeDefined()
          expect(booking[0].tour_id).toBe(tour[0].id)
          expect(booking[0].order_id).toBe("test_order_123")
          expect(booking[0].status).toBe("pending")
        })

        it("should retrieve tour with bookings relation", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Tour With Bookings Test",
            description: "Testing tour with bookings",
            duration_days: 1,
            max_capacity: 10,
          }])

          await service.createTourBookings([
            {
              tour: tour[0].id,
              order_id: "order_1",
              tour_date: nextWeek,
              status: "confirmed"
            },
            {
              tour: tour[0].id,
              order_id: "order_2",
              tour_date: nextWeek,
              status: "pending"
            }
          ])

          const retrieved = await service.retrieveTour(tour[0].id, {
            relations: ["bookings"]
          })

          expect(retrieved.bookings).toBeDefined()
          expect(retrieved.bookings.length).toBe(2)
        })

        it("should enforce capacity through validateBooking with existing bookings", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Capacity Enforcement Test",
            description: "Testing capacity enforcement",
            duration_days: 1,
            max_capacity: 5,
          }])

          await service.createTourBookings([
            { tour: tour[0].id, order_id: "o1", tour_date: nextWeek, status: "confirmed" },
            { tour: tour[0].id, order_id: "o2", tour_date: nextWeek, status: "confirmed" },
            { tour: tour[0].id, order_id: "o3", tour_date: nextWeek, status: "confirmed" },
            { tour: tour[0].id, order_id: "o4", tour_date: nextWeek, status: "confirmed" }
          ])

          const validation = await service.validateBooking(
            tour[0].id,
            nextWeek,
            2
          )

          expect(validation.valid).toBe(false)

          const validation2 = await service.validateBooking(
            tour[0].id,
            nextWeek,
            1
          )

          expect(validation2.valid).toBe(true)
        })
      })

      describe("Complex Scenarios", () => {
        it("should handle tour with all new fields populated", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Complete Tour Test",
            description: "Tour with all new fields",
            duration_days: 2,
            max_capacity: 15,
            is_special: true,
            blocked_dates: ["2026-12-25", "2026-12-31"],
            blocked_week_days: [0, 6],
            cancellation_deadline_hours: 48,
            booking_min_days_ahead: 3
          }])

          expect(tour[0].is_special).toBe(true)
          expect(tour[0].blocked_dates).toEqual(["2026-12-25", "2026-12-31"])
          expect(tour[0].blocked_week_days).toEqual([0, 6])
          expect(tour[0].cancellation_deadline_hours).toBe(48)
          expect(tour[0].booking_min_days_ahead).toBe(3)

          const retrieved = await service.retrieveTour(tour[0].id)
          expect(retrieved.is_special).toBe(true)
          expect(retrieved.blocked_dates).toContain("2026-12-25")
          expect(retrieved.blocked_week_days.map(Number)).toContain(0)
          expect(retrieved.cancellation_deadline_hours).toBe(48)
          expect(retrieved.booking_min_days_ahead).toBe(3)
        })

        it("should handle multiple tours with different configurations", async () => {
          const specialTour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Special Holiday Tour",
            duration_days: 1,
            max_capacity: 20,
            is_special: true,
            blocked_dates: ["2026-12-25"],
            blocked_week_days: [0],
            cancellation_deadline_hours: 72,
            booking_min_days_ahead: 7
          }])

          const regularTour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Regular Daily Tour",
            duration_days: 1,
            max_capacity: 10,
            is_special: false,
            blocked_dates: [],
            blocked_week_days: [6],
            cancellation_deadline_hours: 24,
            booking_min_days_ahead: 2
          }])

          expect(specialTour[0].is_special).toBe(true)
          expect(specialTour[0].cancellation_deadline_hours).toBe(72)
          expect(specialTour[0].booking_min_days_ahead).toBe(7)

          expect(regularTour[0].is_special).toBe(false)
          expect(regularTour[0].cancellation_deadline_hours).toBe(24)
          expect(regularTour[0].booking_min_days_ahead).toBe(2)

          const tours = await service.listTours()
          const specialCount = tours.filter(t => t.is_special).length
          const regularCount = tours.filter(t => !t.is_special).length

          expect(specialCount).toBeGreaterThanOrEqual(1)
          expect(regularCount).toBeGreaterThanOrEqual(1)
        })

        it("should handle edge case: zero capacity tour", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Zero Capacity Tour",
            description: "Tour with zero capacity",
            duration_days: 1,
            max_capacity: 0,
          }])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(0)

          const validation = await service.validateBooking(
            tour[0].id,
            nextWeek,
            1
          )

          expect(validation.valid).toBe(false)
        })

        it("should handle edge case: very large capacity", async () => {
          const tour = await service.createTours([{
            product_id: generateProductId(),
            destination: "Large Capacity Tour",
            description: "Tour with large capacity",
            duration_days: 1,
            max_capacity: 1000,
          }])

          const capacity = await service.getAvailableCapacity(
            tour[0].id,
            nextWeek
          )

          expect(capacity).toBe(1000)
        })
      })
    })
  }
})

jest.setTimeout(60 * 1000)
