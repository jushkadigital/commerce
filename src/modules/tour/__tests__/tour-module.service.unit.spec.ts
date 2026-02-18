import TourModuleService from "../service"
import { PassengerType } from "../models/tour-variant"
import { Modules } from "@medusajs/framework/utils"

describe("TourModuleService", () => {
  let tourModuleService: TourModuleService
  let mockRetrieveTour: jest.Mock
  let mockListTourBookings: jest.Mock
  let mockContainer: any
  let mockPricingModule: any
  let mockQuery: any

  beforeEach(() => {
    mockRetrieveTour = jest.fn()
    mockListTourBookings = jest.fn()

    mockPricingModule = {
      calculatePrices: jest.fn(),
      updatePriceSets: jest.fn(),
    }

    mockQuery = {
      graph: jest.fn(),
    }

    mockContainer = {
      resolve: jest.fn((moduleKey: string) => {
        if (moduleKey === Modules.PRICING) return mockPricingModule
        if (moduleKey === "query") return mockQuery
        return undefined
      }),
    }

    tourModuleService = new TourModuleService({} as any)
    
    Object.defineProperty(tourModuleService, "retrieveTour", {
      value: mockRetrieveTour,
      writable: true,
      configurable: true,
    })
    
    Object.defineProperty(tourModuleService, "listTourBookings", {
      value: mockListTourBookings,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("getAvailableCapacity", () => {
    it("calculates available capacity correctly", async () => {
      const tourId = "tour_123"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 10

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 2, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      expect(result).toBe(8)
      expect(mockRetrieveTour).toHaveBeenCalledWith(tourId)
      expect(mockListTourBookings).toHaveBeenCalledWith({
        tour_id: tourId,
        tour_date: tourDate,
        status: ["confirmed", "pending"],
      })
    })

    it("returns full capacity when no bookings", async () => {
      const tourId = "tour_456"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 5

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      expect(result).toBe(5)
    })

    it("returns zero when capacity is full", async () => {
      const tourId = "tour_789"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 5

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 3, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_2", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_456",
                metadata: {
                  passengers: { adults: 1, children: 1, infants: 0 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      expect(result).toBe(0)
    })

    it("returns negative when overbooked", async () => {
      const tourId = "tour_overbooked"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 2

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 2, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_2", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_456",
                metadata: {
                  passengers: { adults: 1, children: 1, infants: 0 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      expect(result).toBe(-2)
    })

    it("throws error when tour not found", async () => {
      const tourId = "non_existent_tour"
      const tourDate = new Date("2026-03-15")

      mockRetrieveTour.mockRejectedValue(new Error("Tour not found"))

      await expect(tourModuleService.getAvailableCapacity(tourId, tourDate)).rejects.toThrow("Tour not found")
    })

    it("calculates capacity excluding infants", async () => {
      const tourId = "tour_with_infants"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 10

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 2, children: 1, infants: 1 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      // 2 adults + 1 child = 3 passengers (1 infant NOT counted)
      expect(result).toBe(7)
    })

    it("handles missing metadata gracefully", async () => {
      const tourId = "tour_no_metadata"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 10

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: null
        },
        { 
          id: "booking_2", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "pending",
          line_items: {
            items: []
          }
        },
        { 
          id: "booking_3", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: null
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      // All bookings have missing/null metadata, should count as 0 passengers
      expect(result).toBe(10)
    })

    it("sums passengers across multiple bookings", async () => {
      const tourId = "tour_multiple_bookings"
      const tourDate = new Date("2026-03-15")
      const maxCapacity = 20

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: maxCapacity,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 2, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_2", 
          tour_id: tourId, 
          tour_date: tourDate, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_456",
                metadata: {
                  passengers: { adults: 3, children: 2, infants: 1 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.getAvailableCapacity(tourId, tourDate)

      // Booking 1: 2 adults = 2
      // Booking 2: 3 adults + 2 children = 5 (1 infant ignored)
      // Total reserved: 7
      expect(result).toBe(13)
    })
  })

  describe("validateBooking", () => {
    it("validates booking when date is available and capacity exists", async () => {
      const tourId = "tour_123"
      const tourDate = new Date("2026-12-25")
      const quantity = 2

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: 10,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.validateBooking(tourId, tourDate, quantity)

      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it("rejects booking for past dates", async () => {
      const tourId = "tour_123"
      const pastDate = new Date("2020-01-01")
      const quantity = 1

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: 10,
      })

      const result = await tourModuleService.validateBooking(tourId, pastDate, quantity)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain("past")
    })

    it("rejects booking for unavailable dates", async () => {
      const tourId = "tour_123"
      const unavailableDate = new Date("2026-12-25")
      const quantity = 1

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: 10,
        blocked_dates: ["2026-12-25"],
      })

      const result = await tourModuleService.validateBooking(tourId, unavailableDate, quantity)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain("not available")
    })

    it("rejects booking exceeding available capacity", async () => {
      const tourId = "tour_123"
      const tourDate = new Date("2026-12-25")
      const quantity = 5

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: 10,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_2", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_456",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_3", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_789",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_4", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_abc",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_5", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_def",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_6", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_ghi",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_7", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_jkl",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_8", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_mno",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.validateBooking(tourId, tourDate, quantity)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain("Only")
      expect(result.reason).toContain("available")
    })

    it("accepts booking for exactly remaining capacity", async () => {
      const tourId = "tour_123"
      const tourDate = new Date("2026-12-25")
      const quantity = 2

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        max_capacity: 10,
      })

      mockListTourBookings.mockResolvedValue([
        { 
          id: "booking_1", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_123",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_2", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_456",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_3", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_789",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_4", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_abc",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_5", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_def",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_6", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_ghi",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_7", 
          tour_id: tourId, 
          status: "confirmed",
          line_items: {
            items: [
              {
                variant_id: "variant_jkl",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
        { 
          id: "booking_8", 
          tour_id: tourId, 
          status: "pending",
          line_items: {
            items: [
              {
                variant_id: "variant_mno",
                metadata: {
                  passengers: { adults: 1, children: 0, infants: 0 }
                }
              }
            ]
          }
        },
      ])

      const result = await tourModuleService.validateBooking(tourId, tourDate, quantity)

      expect(result.valid).toBe(true)
    })

    it("throws error when tour retrieval fails", async () => {
      const tourId = "invalid_tour"
      const tourDate = new Date("2026-12-25")
      const quantity = 1

      mockRetrieveTour.mockRejectedValue(new Error("Tour not found"))

      await expect(tourModuleService.validateBooking(tourId, tourDate, quantity)).rejects.toThrow("Tour not found")
    })
  })

  describe("getTourPricing", () => {
    it("returns pricing with zeros when no container provided", async () => {
      const tourId = "tour_123"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Machu Picchu",
        variants: [],
      })

      const result = await tourModuleService.getTourPricing(tourId)

      expect(result.tourId).toBe(tourId)
      expect(result.destination).toBe("Machu Picchu")
      expect(result.prices.adult).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.child).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.infant).toEqual({ price: 0, currency: "PEN" })
    })

    it("returns pricing with specified currency", async () => {
      const tourId = "tour_123"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Cusco",
        variants: [],
      })

      const result = await tourModuleService.getTourPricing(tourId, { currencyCode: "USD" })

      expect(result.prices.adult.currency).toBe("USD")
      expect(result.prices.child.currency).toBe("USD")
      expect(result.prices.infant.currency).toBe("USD")
    })

    it("fetches and maps pricing from Pricing Module", async () => {
      const tourId = "tour_123"
      const variantId1 = "variant_123"
      const variantId2 = "variant_456"
      const variantId3 = "variant_789"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantId1, passenger_type: PassengerType.ADULT },
          { id: "tv_2", variant_id: variantId2, passenger_type: PassengerType.CHILD },
          { id: "tv_3", variant_id: variantId3, passenger_type: PassengerType.INFANT },
        ],
      })

      mockPricingModule.calculatePrices.mockResolvedValue([
        { id: variantId1, calculated_amount: 100 },
        { id: variantId2, calculated_amount: 70 },
        { id: variantId3, calculated_amount: 0 },
      ])

      const result = await tourModuleService.getTourPricing(tourId, { container: mockContainer })

      expect(mockContainer.resolve).toHaveBeenCalledWith(Modules.PRICING)
      expect(mockPricingModule.calculatePrices).toHaveBeenCalledWith(
        { id: [variantId1, variantId2, variantId3] },
        {
          context: {
            currency_code: "PEN",
          },
        }
      )
      expect(result.prices.adult).toEqual({ price: 100, currency: "PEN" })
      expect(result.prices.child).toEqual({ price: 70, currency: "PEN" })
      expect(result.prices.infant).toEqual({ price: 0, currency: "PEN" })
    })

    it("handles missing variants gracefully", async () => {
      const tourId = "tour_123"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: undefined,
      })

      const result = await tourModuleService.getTourPricing(tourId, { container: mockContainer })

      expect(mockPricingModule.calculatePrices).not.toHaveBeenCalled()
      expect(result.prices.adult).toEqual({ price: 0, currency: "PEN" })
    })

    it("handles variants without variant_id", async () => {
      const tourId = "tour_123"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", passenger_type: PassengerType.ADULT },
        ],
      })

      const result = await tourModuleService.getTourPricing(tourId, { container: mockContainer })

      expect(mockPricingModule.calculatePrices).not.toHaveBeenCalled()
      expect(result.prices.adult).toEqual({ price: 0, currency: "PEN" })
    })

    it("handles pricing module errors gracefully", async () => {
      const tourId = "tour_123"
      const variantId1 = "variant_123"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantId1, passenger_type: PassengerType.ADULT },
        ],
      })

      mockPricingModule.calculatePrices.mockRejectedValue(new Error("Pricing service unavailable"))

      const result = await tourModuleService.getTourPricing(tourId, { container: mockContainer })

      expect(result.prices.adult).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.child).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.infant).toEqual({ price: 0, currency: "PEN" })
    })

    it("only maps prices for found variants", async () => {
      const tourId = "tour_123"
      const variantId1 = "variant_123"
      const variantId2 = "variant_456"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantId1, passenger_type: PassengerType.ADULT },
          { id: "tv_2", variant_id: variantId2, passenger_type: PassengerType.CHILD },
          { id: "tv_3", passenger_type: PassengerType.INFANT },
        ],
      })

      mockPricingModule.calculatePrices.mockResolvedValue([
        { id: variantId1, calculated_amount: 150 },
      ])

      const result = await tourModuleService.getTourPricing(tourId, { container: mockContainer })

      expect(result.prices.adult).toEqual({ price: 150, currency: "PEN" })
      expect(result.prices.child).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.infant).toEqual({ price: 0, currency: "PEN" })
    })

    it("handles null calculated_amount", async () => {
      const tourId = "tour_123"
      const variantId1 = "variant_123"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantId1, passenger_type: PassengerType.ADULT },
        ],
      })

      mockPricingModule.calculatePrices.mockResolvedValue([
        { id: variantId1, calculated_amount: null },
      ])

      const result = await tourModuleService.getTourPricing(tourId, { container: mockContainer })

      expect(result.prices.adult).toEqual({ price: 0, currency: "PEN" })
    })
  })

  describe("calculateCartTotal", () => {
    let mockGetTourPricing: jest.Mock

    beforeEach(() => {
      mockGetTourPricing = jest.fn()
      Object.defineProperty(tourModuleService, "getTourPricing", {
        value: mockGetTourPricing,
        writable: true,
        configurable: true,
      })
    })

    it("calculates cart total correctly with single item", async () => {
      const tourId = "tour_123"
      const items = [
        {
          tour_id: tourId,
          tour_date: "2026-03-15",
          adults: 2,
          children: 1,
          infants: 0,
          passengers: [],
        },
      ]

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Machu Picchu",
      })

      mockGetTourPricing.mockResolvedValue({
        tourId: tourId,
        destination: "Machu Picchu",
        prices: {
          adult: { price: 100, currency: "USD" },
          child: { price: 70, currency: "USD" },
          infant: { price: 0, currency: "USD" },
        },
      })

      const result = await tourModuleService.calculateCartTotal(items, mockContainer)

      expect(result.subtotal).toBe(270)
      expect(result.currency).toBe("USD")
      expect(result.items).toHaveLength(1)
      expect(result.items[0].adults.total).toBe(200)
      expect(result.items[0].children.total).toBe(70)
      expect(result.items[0].infants.total).toBe(0)
    })

    it("calculates cart total correctly with multiple items", async () => {
      const tourId1 = "tour_123"
      const tourId2 = "tour_456"

      const items = [
        {
          tour_id: tourId1,
          tour_date: "2026-03-15",
          adults: 1,
          children: 0,
          infants: 0,
          passengers: [],
        },
        {
          tour_id: tourId2,
          tour_date: "2026-03-20",
          adults: 2,
          children: 1,
          infants: 1,
          passengers: [],
        },
      ]

      mockRetrieveTour
        .mockResolvedValueOnce({
          id: tourId1,
          destination: "Machu Picchu",
        })
        .mockResolvedValueOnce({
          id: tourId2,
          destination: "Cusco",
        })

      mockGetTourPricing
        .mockResolvedValueOnce({
          tourId: tourId1,
          destination: "Machu Picchu",
          prices: {
            adult: { price: 150, currency: "USD" },
            child: { price: 100, currency: "USD" },
            infant: { price: 50, currency: "USD" },
          },
        })
        .mockResolvedValueOnce({
          tourId: tourId2,
          destination: "Cusco",
          prices: {
            adult: { price: 200, currency: "USD" },
            child: { price: 150, currency: "USD" },
            infant: { price: 100, currency: "USD" },
          },
        })

      const result = await tourModuleService.calculateCartTotal(items, mockContainer)

      expect(result.subtotal).toBe(800)
      expect(result.currency).toBe("USD")
      expect(result.items).toHaveLength(2)
    })

    it("handles empty cart", async () => {
      const items: any[] = []

      const result = await tourModuleService.calculateCartTotal(items, mockContainer)

      expect(result.subtotal).toBe(0)
      expect(result.currency).toBe("PEN")
      expect(result.items).toHaveLength(0)
    })

    it("uses default currency when container not provided", async () => {
      const tourId = "tour_123"
      const items = [
        {
          tour_id: tourId,
          tour_date: "2026-03-15",
          adults: 1,
          children: 0,
          infants: 0,
          passengers: [],
        },
      ]

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
      })

      mockGetTourPricing.mockResolvedValue({
        tourId: tourId,
        destination: "Lima",
        prices: {
          adult: { price: 100, currency: "PEN" },
          child: { price: 70, currency: "PEN" },
          infant: { price: 0, currency: "PEN" },
        },
      })

      const result = await tourModuleService.calculateCartTotal(items)

      expect(result.currency).toBe("PEN")
    })

    it("handles zero quantity passengers", async () => {
      const tourId = "tour_123"
      const items = [
        {
          tour_id: tourId,
          tour_date: "2026-03-15",
          adults: 0,
          children: 0,
          infants: 0,
          passengers: [],
        },
      ]

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
      })

      mockGetTourPricing.mockResolvedValue({
        tourId: tourId,
        destination: "Lima",
        prices: {
          adult: { price: 100, currency: "USD" },
          child: { price: 70, currency: "USD" },
          infant: { price: 50, currency: "USD" },
        },
      })

      const result = await tourModuleService.calculateCartTotal(items, mockContainer)

      expect(result.subtotal).toBe(0)
      expect(result.items[0].adults.total).toBe(0)
      expect(result.items[0].children.total).toBe(0)
      expect(result.items[0].infants.total).toBe(0)
    })

    it("includes item details in result", async () => {
      const tourId = "tour_123"
      const tourDate = "2026-03-15"
      const items = [
        {
          tour_id: tourId,
          tour_date: tourDate,
          adults: 2,
          children: 1,
          infants: 0,
          passengers: [],
        },
      ]

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Sacred Valley",
      })

      mockGetTourPricing.mockResolvedValue({
        tourId: tourId,
        destination: "Sacred Valley",
        prices: {
          adult: { price: 100, currency: "USD" },
          child: { price: 70, currency: "USD" },
          infant: { price: 0, currency: "USD" },
        },
      })

      const result = await tourModuleService.calculateCartTotal(items, mockContainer)

      expect(result.items[0].tour_id).toBe(tourId)
      expect(result.items[0].destination).toBe("Sacred Valley")
      expect(result.items[0].tour_date).toBe(tourDate)
      expect(result.items[0].adults.quantity).toBe(2)
      expect(result.items[0].adults.unit_price).toBe(100)
      expect(result.items[0].children.quantity).toBe(1)
      expect(result.items[0].children.unit_price).toBe(70)
    })
  })

  describe("updateVariantPrices", () => {
    it("skips update when no container provided", async () => {
      const tourId = "tour_123"
      const prices = {
        adult: 150,
        child: 100,
        infant: 50,
      }

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [],
      })

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      await tourModuleService.updateVariantPrices(tourId, prices)

      expect(consoleWarnSpy).toHaveBeenCalledWith("No container provided to updateVariantPrices, skipping pricing update")
      expect(mockPricingModule.updatePriceSets).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it("skips update when no variants found", async () => {
      const tourId = "tour_123"
      const prices = {
        adult: 150,
      }

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [],
      })

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(consoleWarnSpy).toHaveBeenCalledWith("No variant IDs found for tour", tourId)
      expect(mockPricingModule.updatePriceSets).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it("updates prices for all passenger types", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"
      const variantIdChild = "variant_child"
      const variantIdInfant = "variant_infant"
      const priceSetIdAdult = "price_set_adult"
      const priceSetIdChild = "price_set_child"
      const priceSetIdInfant = "price_set_infant"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
          { id: "tv_2", variant_id: variantIdChild, passenger_type: PassengerType.CHILD },
          { id: "tv_3", variant_id: variantIdInfant, passenger_type: PassengerType.INFANT },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: [
          { id: variantIdAdult, price_set: { id: priceSetIdAdult } },
          { id: variantIdChild, price_set: { id: priceSetIdChild } },
          { id: variantIdInfant, price_set: { id: priceSetIdInfant } },
        ],
      })

      const prices = {
        adult: 150,
        child: 100,
        infant: 50,
        currency_code: "USD",
      }

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(3)
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith(priceSetIdAdult, {
        prices: [{ amount: 150, currency_code: "usd" }],
      })
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith(priceSetIdChild, {
        prices: [{ amount: 100, currency_code: "usd" }],
      })
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith(priceSetIdInfant, {
        prices: [{ amount: 50, currency_code: "usd" }],
      })
    })

    it("uses PEN as default currency", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"
      const priceSetIdAdult = "price_set_adult"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: [{ id: variantIdAdult, price_set: { id: priceSetIdAdult } }],
      })

      const prices = {
        adult: 300,
      }

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith(priceSetIdAdult, {
        prices: [{ amount: 300, currency_code: "pen" }],
      })
    })

    it("skips variants without price set", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"
      const variantIdChild = "variant_child"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
          { id: "tv_2", variant_id: variantIdChild, passenger_type: PassengerType.CHILD },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: [
          { id: variantIdAdult, price_set: { id: "price_set_adult" } },
          { id: variantIdChild, price_set: null },
        ],
      })

      const prices = {
        adult: 150,
        child: 100,
      }

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith(`No price set found for variant ${variantIdChild}`)

      consoleWarnSpy.mockRestore()
    })

    it("skips variants without variant_id", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
          { id: "tv_2", passenger_type: PassengerType.CHILD },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: [{ id: variantIdAdult, price_set: { id: "price_set_adult" } }],
      })

      const prices = {
        adult: 150,
        child: 100,
      }

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(1)
    })

    it("continues with next variant if update fails", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"
      const variantIdChild = "variant_child"
      const priceSetIdAdult = "price_set_adult"
      const priceSetIdChild = "price_set_child"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
          { id: "tv_2", variant_id: variantIdChild, passenger_type: PassengerType.CHILD },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: [
          { id: variantIdAdult, price_set: { id: priceSetIdAdult } },
          { id: variantIdChild, price_set: { id: priceSetIdChild } },
        ],
      })

      mockPricingModule.updatePriceSets
        .mockRejectedValueOnce(new Error("Price update failed"))
        .mockResolvedValueOnce(undefined)

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

      const prices = {
        adult: 150,
        child: 100,
      }

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(2)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error updating price for variant ${variantIdAdult}:`,
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it("handles empty query result", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: [],
      })

      const prices = {
        adult: 150,
      }

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).not.toHaveBeenCalled()
    })

    it("handles query result with undefined data", async () => {
      const tourId = "tour_123"
      const variantIdAdult = "variant_adult"

      mockRetrieveTour.mockResolvedValue({
        id: tourId,
        destination: "Lima",
        variants: [
          { id: "tv_1", variant_id: variantIdAdult, passenger_type: PassengerType.ADULT },
        ],
      })

      mockQuery.graph.mockResolvedValue({
        data: undefined,
      })

      const prices = {
        adult: 150,
      }

      await tourModuleService.updateVariantPrices(tourId, prices, mockContainer)

      expect(mockPricingModule.updatePriceSets).not.toHaveBeenCalled()
    })
  })
})
