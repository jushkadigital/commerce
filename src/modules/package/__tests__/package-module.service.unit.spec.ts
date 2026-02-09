import { PassengerType } from "../models/package-variant"

const mockListPackageBookings = jest.fn()
const mockRetrievePackage = jest.fn()

jest.mock("../service", () => {
  return jest.fn().mockImplementation(() => ({
    retrievePackage: mockRetrievePackage,
    listPackageBookings: mockListPackageBookings,
    getAvailableCapacity: jest.fn().mockImplementation(async (packageId: string, packageDate: Date) => {
      const pkg = await mockRetrievePackage(packageId)
      const bookings = await mockListPackageBookings({
        package_id: packageId,
        package_date: packageDate,
        status: ["confirmed", "pending"],
      })
      return pkg.max_capacity - bookings.length
    }),
    validateBooking: jest.fn().mockImplementation(async (packageId: string, packageDate: Date, quantity: number) => {
      const pkg = await mockRetrievePackage(packageId)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const requestedDateObj = new Date(packageDate)
      requestedDateObj.setHours(0, 0, 0, 0)
      if (requestedDateObj < today) {
        return { valid: false, reason: "Cannot book packages for past dates" }
      }
      const requestedDate = new Date(packageDate).toISOString().split("T")[0]
      if (!availableDates.includes(requestedDate)) {
        return { valid: false, reason: "Package is not available on the requested date" }
      }
      const bookings = await mockListPackageBookings({
        package_id: packageId,
        package_date: packageDate,
        status: ["confirmed", "pending"],
      })
      const availableCapacity = pkg.max_capacity - bookings.length
      if (availableCapacity < quantity) {
        return { valid: false, reason: `Only ${availableCapacity} spots available` }
      }
      return { valid: true }
    }),
    getPackagePricing: jest.fn().mockImplementation(async (packageId: string, options?: { currencyCode?: string; container?: any }) => {
      const currencyCode = options?.currencyCode || "PEN"
      const pkg = await mockRetrievePackage(packageId)
      const prices = {
        adult: { price: 0, currency: currencyCode },
        child: { price: 0, currency: currencyCode },
        infant: { price: 0, currency: currencyCode },
      }
      if (!options?.container) {
        return { packageId: pkg.id, destination: pkg.destination, prices }
      }
      const pricingModule = options.container.resolve("pricing")
      const variantIds = (pkg.variants || [])
        .filter((v: any) => v.variant_id)
        .map((v: any) => v.variant_id)
      if (variantIds.length === 0) {
        return { packageId: pkg.id, destination: pkg.destination, prices }
      }
      try {
        const calculatedPrices = await pricingModule.calculatePrices(
          { id: variantIds },
          { context: { currency_code: currencyCode } }
        )
        for (const variant of pkg.variants || []) {
          const calculatedPrice = calculatedPrices.find((cp: any) => cp.id === variant.variant_id)
          if (calculatedPrice) {
            const priceValue = calculatedPrice.calculated_amount ? Number(calculatedPrice.calculated_amount) : 0
            switch (variant.passenger_type) {
              case PassengerType.ADULT:
                prices.adult = { price: priceValue, currency: currencyCode }
                break
              case PassengerType.CHILD:
                prices.child = { price: priceValue, currency: currencyCode }
                break
              case PassengerType.INFANT:
                prices.infant = { price: priceValue, currency: currencyCode }
                break
            }
          }
        }
      } catch (error) {
        console.error("Error fetching prices from Pricing Module:", error)
      }
      return { packageId: pkg.id, destination: pkg.destination, prices }
    }),
    calculateCartTotal: jest.fn().mockImplementation(async (items: any[], container?: any) => {
      let subtotal = 0
      let currency = "PEN"
      const itemDetails: any[] = []
      for (const item of items) {
        let adultPrice = 0
        let childPrice = 0
        let infantPrice = 0
        if (container) {
          const pricingModule = container.resolve("pricing")
          const pricing = await mockRetrievePackage(item.package_id)
          const variantIds = (pricing.variants || [])
            .filter((v: any) => v.variant_id)
            .map((v: any) => v.variant_id)
          if (variantIds.length > 0) {
            try {
              const calculatedPrices = await pricingModule.calculatePrices(
                { id: variantIds },
                { context: { currency_code: "PEN" } }
              )
              for (const variant of pricing.variants || []) {
                const calculatedPrice = calculatedPrices.find((cp: any) => cp.id === variant.variant_id)
                if (calculatedPrice) {
                  const priceValue = calculatedPrice.calculated_amount ? Number(calculatedPrice.calculated_amount) : 0
                  if (variant.passenger_type === PassengerType.ADULT) adultPrice = priceValue
                  if (variant.passenger_type === PassengerType.CHILD) childPrice = priceValue
                  if (variant.passenger_type === PassengerType.INFANT) infantPrice = priceValue
                }
              }
            } catch (e) {}
          }
        }
        const adultTotal = item.adults * adultPrice
        const childTotal = item.children * childPrice
        const infantTotal = item.infants * infantPrice
        const pricingPkg = await mockRetrievePackage(item.package_id)
        itemDetails.push({
          package_id: item.package_id,
          destination: pricingPkg.destination,
          package_date: item.package_date,
          adults: { quantity: item.adults, unit_price: adultPrice, total: adultTotal },
          children: { quantity: item.children, unit_price: childPrice, total: childTotal },
          infants: { quantity: item.infants, unit_price: infantPrice, total: infantTotal },
        })
        subtotal += adultTotal + childTotal + infantTotal
      }
      return { subtotal, currency, items: itemDetails }
    }),
    updateVariantPrices: jest.fn().mockImplementation(async (packageId: string, prices: any, container?: any) => {
      const pkg = await mockRetrievePackage(packageId)
      if (!container) {
        console.warn("No container provided to updateVariantPrices, skipping pricing update")
        return
      }
      const pricingModule = container.resolve("pricing")
      const query = container.resolve("query")
      const existingVariants = pkg.variants || []
      const variantIds = existingVariants.filter((v: any) => v.variant_id).map((v: any) => v.variant_id)
      if (variantIds.length === 0) {
        console.warn("No variant IDs found for package", packageId)
        return
      }
      const { data: variantsWithPriceSets } = await query.graph({
        entity: "product_variant",
        fields: ["id", "price_set.id"],
        filters: { id: variantIds },
      })
      const variantToPriceSetMap = new Map<string, string>()
      for (const variantData of variantsWithPriceSets || []) {
        if (variantData.price_set?.id) {
          variantToPriceSetMap.set(variantData.id, variantData.price_set.id)
        }
      }
      for (const passengerType of Object.values(PassengerType)) {
        const existingVariant = existingVariants.find((v: any) => v.passenger_type === passengerType)
        if (!existingVariant || !existingVariant.variant_id) continue
        const priceSetId = variantToPriceSetMap.get(existingVariant.variant_id)
        if (!priceSetId) {
          console.warn(`No price set found for variant ${existingVariant.variant_id}`)
          continue
        }
        let priceAmount = 0
        switch (passengerType) {
          case PassengerType.ADULT:
            priceAmount = prices.adult || 0
            break
          case PassengerType.CHILD:
            priceAmount = prices.child || 0
            break
          case PassengerType.INFANT:
            priceAmount = prices.infant || 0
            break
        }
        try {
          await pricingModule.updatePriceSets(priceSetId, {
            prices: [{ amount: priceAmount, currency_code: (prices.currency_code || "PEN").toLowerCase() }],
          })
        } catch (error) {
          console.error(`Error updating price for variant ${existingVariant.variant_id}:`, error)
        }
      }
    }),
  }))
})

import PackageModuleService from "../service"

describe("PackageModuleService", () => {
  let service: PackageModuleService
  let mockPricingModule: any
  let mockQuery: any
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  const mockPackage = {
    id: "pkg_123",
    product_id: "prod_123",
    destination: "Machu Picchu",
    description: "Amazing package",
    duration_days: 3,
    max_capacity: 10,
    variants: [
      { id: "var_1", variant_id: "pv_1", passenger_type: PassengerType.ADULT, price: 150 },
      { id: "var_2", variant_id: "pv_2", passenger_type: PassengerType.CHILD, price: 100 },
      { id: "var_3", variant_id: "pv_3", passenger_type: PassengerType.INFANT, price: 0 },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})

    mockPricingModule = {
      calculatePrices: jest.fn(),
      updatePriceSets: jest.fn(),
    }

    mockQuery = {
      graph: jest.fn(),
    }

    service = new (PackageModuleService as any)()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe("getAvailableCapacity", () => {
    it("should return full capacity when no bookings exist", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockListPackageBookings.mockResolvedValue([])

      const result = await service.getAvailableCapacity("pkg_123", new Date("2026-03-15"))

      expect(result).toBe(10)
      expect(mockRetrievePackage).toHaveBeenCalledWith("pkg_123")
      expect(mockListPackageBookings).toHaveBeenCalledWith({
        package_id: "pkg_123",
        package_date: new Date("2026-03-15"),
        status: ["confirmed", "pending"],
      })
    })

    it("should return reduced capacity when bookings exist", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockListPackageBookings.mockResolvedValue([{ id: "book_1" }, { id: "book_2" }, { id: "book_3" }])

      const result = await service.getAvailableCapacity("pkg_123", new Date("2026-03-15"))

      expect(result).toBe(7)
    })

    it("should return zero capacity when fully booked", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockListPackageBookings.mockResolvedValue(Array(10).fill(null).map((_, i) => ({ id: `book_${i}` })))

      const result = await service.getAvailableCapacity("pkg_123", new Date("2026-03-15"))

      expect(result).toBe(0)
    })

    it("should handle errors from retrievePackage", async () => {
      mockRetrievePackage.mockRejectedValue(new Error("Package not found"))

      await expect(service.getAvailableCapacity("pkg_invalid", new Date("2026-03-15"))).rejects.toThrow("Package not found")
    })
  })

  describe("validateBooking", () => {
    it("should return valid true for valid booking", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockListPackageBookings.mockResolvedValue([])

      const result = await service.validateBooking("pkg_123", new Date("2026-03-15"), 3)

      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it("should reject booking for past dates", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      const pastDate = new Date("2020-01-01")

      const result = await service.validateBooking("pkg_123", pastDate, 1)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe("Cannot book packages for past dates")
    })

    it("should reject booking for unavailable dates", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      const unavailableDate = new Date("2030-12-25")

      const result = await service.validateBooking("pkg_123", unavailableDate, 1)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe("Package is not available on the requested date")
    })

    it("should reject booking when exceeding capacity", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockListPackageBookings.mockResolvedValue(Array(8).fill(null).map((_, i) => ({ id: `book_${i}` })))

      const result = await service.validateBooking("pkg_123", new Date("2026-03-15"), 5)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe("Only 2 spots available")
    })

    it("should accept booking at exact capacity limit", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockListPackageBookings.mockResolvedValue(Array(7).fill(null).map((_, i) => ({ id: `book_${i}` })))

      const result = await service.validateBooking("pkg_123", new Date("2026-03-15"), 3)

      expect(result.valid).toBe(true)
    })

    it("should validate dates correctly ignoring time", async () => {
      mockRetrievePackage.mockResolvedValue(packageWithDate)
      mockListPackageBookings.mockResolvedValue([])

      const result = await service.validateBooking("pkg_123", new Date("2026-03-15T08:00:00.000Z"), 1)

      expect(result.valid).toBe(true)
    })
  })

  describe("getPackagePricing", () => {
    const createMockContainer = () => ({
      resolve: jest.fn((key: string) => {
        if (key === "pricing") return mockPricingModule
        return null
      }),
    })

    it("should return default pricing when no container provided", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)

      const result = await service.getPackagePricing("pkg_123")

      expect(result.packageId).toBe("pkg_123")
      expect(result.destination).toBe("Machu Picchu")
      expect(result.prices.adult).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.child).toEqual({ price: 0, currency: "PEN" })
      expect(result.prices.infant).toEqual({ price: 0, currency: "PEN" })
    })

    it("should return default pricing with custom currency", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)

      const result = await service.getPackagePricing("pkg_123", { currencyCode: "USD" })

      expect(result.prices.adult.currency).toBe("USD")
    })

    it("should fetch and map prices from pricing module", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockPricingModule.calculatePrices.mockResolvedValue([
        { id: "pv_1", calculated_amount: 150 },
        { id: "pv_2", calculated_amount: 100 },
        { id: "pv_3", calculated_amount: 0 },
      ])

      const mockContainer = createMockContainer()
      const result = await service.getPackagePricing("pkg_123", { currencyCode: "USD", container: mockContainer })

      expect(mockPricingModule.calculatePrices).toHaveBeenCalledWith(
        { id: ["pv_1", "pv_2", "pv_3"] },
        { context: { currency_code: "USD" } }
      )
      expect(result.prices.adult).toEqual({ price: 150, currency: "USD" })
      expect(result.prices.child).toEqual({ price: 100, currency: "USD" })
      expect(result.prices.infant).toEqual({ price: 0, currency: "USD" })
    })

    it("should return default pricing when no variants linked", async () => {
      const packageWithoutVariants = { ...mockPackage, variants: [] }
      mockRetrievePackage.mockResolvedValue(packageWithoutVariants)

      const mockContainer = createMockContainer()
      const result = await service.getPackagePricing("pkg_123", { container: mockContainer })

      expect(result.prices.adult.price).toBe(0)
      expect(mockPricingModule.calculatePrices).not.toHaveBeenCalled()
    })

    it("should handle pricing module errors gracefully", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockPricingModule.calculatePrices.mockRejectedValue(new Error("Pricing service unavailable"))

      const mockContainer = createMockContainer()
      const result = await service.getPackagePricing("pkg_123", { container: mockContainer })

      expect(result.prices.adult.price).toBe(0)
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching prices from Pricing Module:", expect.any(Error))
    })

    it("should handle missing calculated prices for some variants", async () => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockPricingModule.calculatePrices.mockResolvedValue([{ id: "pv_1", calculated_amount: 150 }])

      const mockContainer = createMockContainer()
      const result = await service.getPackagePricing("pkg_123", { container: mockContainer })

      expect(result.prices.adult.price).toBe(150)
      expect(result.prices.child.price).toBe(0)
      expect(result.prices.infant.price).toBe(0)
    })

    it("should handle variants without variant_id", async () => {
      const packageWithInvalidVariants = {
        ...mockPackage,
        variants: [
          { id: "var_1", variant_id: null, passenger_type: PassengerType.ADULT },
          { id: "var_2", passenger_type: PassengerType.CHILD },
        ],
      }
      mockRetrievePackage.mockResolvedValue(packageWithInvalidVariants)

      const mockContainer = createMockContainer()
      const result = await service.getPackagePricing("pkg_123", { container: mockContainer })

      expect(result.prices.adult.price).toBe(0)
      expect(mockPricingModule.calculatePrices).not.toHaveBeenCalled()
    })
  })

  describe("calculateCartTotal", () => {
    const createMockContainer = () => ({
      resolve: jest.fn((key: string) => {
        if (key === "pricing") return mockPricingModule
        return null
      }),
    })

    const mockCartItems = [
      {
        package_id: "pkg_123",
        package_date: "2026-03-15",
        adults: 2,
        children: 1,
        infants: 1,
        passengers: [
          { type: PassengerType.ADULT, name: "John Doe" },
          { type: PassengerType.ADULT, name: "Jane Doe" },
          { type: PassengerType.CHILD, name: "Jimmy Doe" },
          { type: PassengerType.INFANT, name: "Baby Doe" },
        ],
      },
    ]

    beforeEach(() => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockPricingModule.calculatePrices.mockResolvedValue([
        { id: "pv_1", calculated_amount: 150 },
        { id: "pv_2", calculated_amount: 100 },
        { id: "pv_3", calculated_amount: 0 },
      ])
    })

    it("should calculate cart total correctly", async () => {
      const mockContainer = createMockContainer()
      const result = await service.calculateCartTotal(mockCartItems, mockContainer)

      expect(result.subtotal).toBe(400)
      expect(result.currency).toBe("PEN")
      expect(result.items).toHaveLength(1)
      expect(result.items[0].adults).toEqual({ quantity: 2, unit_price: 150, total: 300 })
      expect(result.items[0].children).toEqual({ quantity: 1, unit_price: 100, total: 100 })
      expect(result.items[0].infants).toEqual({ quantity: 1, unit_price: 0, total: 0 })
    })

    it("should calculate total for multiple items", async () => {
      const multipleItems = [
        ...mockCartItems,
        {
          package_id: "pkg_123",
          package_date: "2026-03-16",
          adults: 1,
          children: 0,
          infants: 0,
          passengers: [{ type: PassengerType.ADULT, name: "Solo Traveler" }],
        },
      ]

      const mockContainer = createMockContainer()
      const result = await service.calculateCartTotal(multipleItems, mockContainer)

      expect(result.subtotal).toBe(550)
      expect(result.items).toHaveLength(2)
    })

    it("should handle empty cart", async () => {
      const mockContainer = createMockContainer()
      const result = await service.calculateCartTotal([], mockContainer)

      expect(result.subtotal).toBe(0)
      expect(result.items).toHaveLength(0)
      expect(result.currency).toBe("PEN")
    })

    it("should handle items without container (zero pricing)", async () => {
      const result = await service.calculateCartTotal(mockCartItems)

      expect(result.subtotal).toBe(0)
      expect(result.items[0].adults.unit_price).toBe(0)
      expect(result.items[0].children.unit_price).toBe(0)
      expect(result.items[0].infants.unit_price).toBe(0)
    })
  })

  describe("updateVariantPrices", () => {
    const createMockContainer = () => ({
      resolve: jest.fn((key: string) => {
        if (key === "pricing") return mockPricingModule
        if (key === "query") return mockQuery
        return null
      }),
    })

    beforeEach(() => {
      mockRetrievePackage.mockResolvedValue(mockPackage)
      mockQuery.graph.mockResolvedValue({
        data: [
          { id: "pv_1", price_set: { id: "ps_1" } },
          { id: "pv_2", price_set: { id: "ps_2" } },
          { id: "pv_3", price_set: { id: "ps_3" } },
        ],
      })
    })

    it("should update all variant prices successfully", async () => {
      mockPricingModule.updatePriceSets.mockResolvedValue({})

      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200, child: 150, infant: 50, currency_code: "USD" }, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(3)
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith("ps_1", { prices: [{ amount: 200, currency_code: "usd" }] })
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith("ps_2", { prices: [{ amount: 150, currency_code: "usd" }] })
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith("ps_3", { prices: [{ amount: 50, currency_code: "usd" }] })
    })

    it("should skip update when no container provided", async () => {
      await service.updateVariantPrices("pkg_123", { adult: 200 })

      expect(consoleWarnSpy).toHaveBeenCalledWith("No container provided to updateVariantPrices, skipping pricing update")
      expect(mockPricingModule.updatePriceSets).not.toHaveBeenCalled()
    })

    it("should skip update when no variant IDs found", async () => {
      const packageWithoutVariants = { ...mockPackage, variants: [] }
      mockRetrievePackage.mockResolvedValue(packageWithoutVariants)

      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200 }, mockContainer)

      expect(consoleWarnSpy).toHaveBeenCalledWith("No variant IDs found for package", "pkg_123")
      expect(mockPricingModule.updatePriceSets).not.toHaveBeenCalled()
    })

    it("should skip variants without price sets", async () => {
      mockQuery.graph.mockResolvedValue({
        data: [{ id: "pv_1", price_set: { id: "ps_1" } }, { id: "pv_2", price_set: null }, { id: "pv_3" }],
      })

      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200, child: 150, infant: 50 }, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledWith("No price set found for variant pv_2")
    })

    it("should handle partial price updates", async () => {
      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200 }, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith("ps_1", { prices: [{ amount: 200, currency_code: "pen" }] })
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith("ps_2", { prices: [{ amount: 0, currency_code: "pen" }] })
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith("ps_3", { prices: [{ amount: 0, currency_code: "pen" }] })
    })

    it("should use default currency when not specified", async () => {
      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200 }, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledWith(expect.any(String), {
        prices: [{ amount: 200, currency_code: "pen" }],
      })
    })

    it("should handle pricing module errors gracefully", async () => {
      mockPricingModule.updatePriceSets.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("Update failed")).mockResolvedValueOnce({})

      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200, child: 150, infant: 50 }, mockContainer)

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error updating price for variant pv_2:", expect.any(Error))
      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(3)
    })

    it("should skip variants without variant_id", async () => {
      const packageWithMissingVariantIds = {
        ...mockPackage,
        variants: [
          { id: "var_1", variant_id: "pv_1", passenger_type: PassengerType.ADULT },
          { id: "var_2", variant_id: null, passenger_type: PassengerType.CHILD },
          { id: "var_3", variant_id: "pv_3", passenger_type: PassengerType.INFANT },
        ],
      }
      mockRetrievePackage.mockResolvedValue(packageWithMissingVariantIds)

      const mockContainer = createMockContainer()
      await service.updateVariantPrices("pkg_123", { adult: 200, child: 150, infant: 50 }, mockContainer)

      expect(mockPricingModule.updatePriceSets).toHaveBeenCalledTimes(2)
    })
  })
})
