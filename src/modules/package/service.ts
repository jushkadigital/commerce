import { MedusaService, Modules } from "@medusajs/framework/utils"
import Package from "./models/package"
import PackageVariant, { PassengerType } from "./models/package-variant"
import PackageBooking from "./models/package-booking"
import PackageServiceVariant from "./models/package-service-variant"

export interface PackagePricing {
  packageId: string
  destination: string
  prices: {
    adult: { price: number; currency: string }
    child: { price: number; currency: string }
    infant: { price: number; currency: string }
  }
}

export interface CartItem {
  package_id: string
  package_date: string
  adults: number
  children: number
  infants: number
  passengers: Array<{
    type: PassengerType
    name: string
    email?: string
    phone?: string
  }>
}

export interface CartTotal {
  subtotal: number
  currency: string
  items: Array<{
    package_id: string
    destination: string
    package_date: string
    adults: { quantity: number; unit_price: number; total: number }
    children: { quantity: number; unit_price: number; total: number }
    infants: { quantity: number; unit_price: number; total: number }
  }>
}

class PackageModuleService extends MedusaService({
  Package,
  PackageVariant,
  PackageBooking,
  PackageServiceVariant,
}) {
  async getAvailableCapacity(
    packageId: string,
    packageDate: Date
  ): Promise<number> {
    const pkg = await this.retrievePackage(packageId)

    const bookings = await this.listPackageBookings({
      package_id: packageId,
      package_date: packageDate,
      status: ["confirmed", "pending"],
    })

    return pkg.max_capacity - bookings.length
  }

  async validateBooking(
    packageId: string,
    packageDate: Date,
    quantity: number
  ): Promise<{ valid: boolean; reason?: string }> {
    const pkg = await this.retrievePackage(packageId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const requestedDateObj = new Date(packageDate)
    requestedDateObj.setHours(0, 0, 0, 0)

    if (requestedDateObj < today) {
      return {
        valid: false,
        reason: "Cannot book packages for past dates",
      }
    }

    const availableDates = pkg.available_dates.map((d: string) => new Date(d).toISOString())
    const requestedDate = new Date(packageDate).toISOString()

    if (!availableDates.includes(requestedDate)) {
      return {
        valid: false,
        reason: "Package is not available on the requested date",
      }
    }

    const availableCapacity = await this.getAvailableCapacity(packageId, packageDate)

    if (availableCapacity < quantity) {
      return {
        valid: false,
        reason: `Only ${availableCapacity} spots available`,
      }
    }

    return { valid: true }
  }

  async getPackagePricing(packageId: string, options?: { currencyCode?: string; container?: any }): Promise<PackagePricing> {
    const currencyCode = options?.currencyCode || "PEN"
    const pkg = await this.retrievePackage(packageId, {
      relations: ["variants"],
    })

    const prices = {
      adult: { price: 0, currency: currencyCode },
      child: { price: 0, currency: currencyCode },
      infant: { price: 0, currency: currencyCode },
    }

    if (!options?.container) {
      return {
        packageId: pkg.id,
        destination: pkg.destination,
        prices,
      }
    }

    const pricingModule = options.container.resolve(Modules.PRICING)

    const variantIds = (pkg.variants || [])
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      return {
        packageId: pkg.id,
        destination: pkg.destination,
        prices,
      }
    }

    try {
      const calculatedPrices = await pricingModule.calculatePrices(
        { id: variantIds },
        {
          context: {
            currency_code: currencyCode,
          },
        }
      )

      for (const variant of pkg.variants || []) {
        const calculatedPrice = calculatedPrices.find(
          (cp: any) => cp.id === variant.variant_id
        )

        if (calculatedPrice) {
          const priceValue = calculatedPrice.calculated_amount
            ? Number(calculatedPrice.calculated_amount)
            : 0

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

    return {
      packageId: pkg.id,
      destination: pkg.destination,
      prices,
    }
  }

  async calculateCartTotal(items: CartItem[], container?: any): Promise<CartTotal> {
    let subtotal = 0
    let currency = "PEN"
    const itemDetails: CartTotal["items"] = []

    for (const item of items) {
      const pricing = await this.getPackagePricing(item.package_id, { container })
      const pkg = await this.retrievePackage(item.package_id)

      const adultTotal = item.adults * pricing.prices.adult.price
      const childTotal = item.children * pricing.prices.child.price
      const infantTotal = item.infants * pricing.prices.infant.price

      currency = pricing.prices.adult.currency

      itemDetails.push({
        package_id: item.package_id,
        destination: pkg.destination,
        package_date: item.package_date,
        adults: {
          quantity: item.adults,
          unit_price: pricing.prices.adult.price,
          total: adultTotal,
        },
        children: {
          quantity: item.children,
          unit_price: pricing.prices.child.price,
          total: childTotal,
        },
        infants: {
          quantity: item.infants,
          unit_price: pricing.prices.infant.price,
          total: infantTotal,
        },
      })

      subtotal += adultTotal + childTotal + infantTotal
    }

    return {
      subtotal,
      currency,
      items: itemDetails,
    }
  }

  async updateVariantPrices(
    packageId: string,
    prices: {
      adult?: number
      child?: number
      infant?: number
      currency_code?: string
    },
    container?: any
  ): Promise<void> {
    const pkg = await this.retrievePackage(packageId, {
      relations: ["variants"],
    })

    const currency = prices.currency_code || "PEN"
    const existingVariants = pkg.variants || []

    if (!container) {
      console.warn("No container provided to updateVariantPrices, skipping pricing update")
      return
    }

    const { ContainerRegistrationKeys } = await import("@medusajs/framework/utils")
    const pricingModule = container.resolve(Modules.PRICING)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const variantIds = existingVariants
      .filter((v: any) => v.variant_id)
      .map((v: any) => v.variant_id)

    if (variantIds.length === 0) {
      console.warn("No variant IDs found for package", packageId)
      return
    }

    const { data: variantsWithPriceSets } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id"],
      filters: {
        id: variantIds,
      },
    })

    const variantToPriceSetMap = new Map<string, string>()
    for (const variantData of variantsWithPriceSets || []) {
      if (variantData.price_set?.id) {
        variantToPriceSetMap.set(variantData.id, variantData.price_set.id)
      }
    }

    for (const passengerType of Object.values(PassengerType)) {
      const existingVariant = existingVariants.find(
        (v: any) => v.passenger_type === passengerType
      )

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
          prices: [
            {
              amount: priceAmount,
              currency_code: currency.toLowerCase(),
            },
          ],
        })
      } catch (error) {
        console.error(
          `Error updating price for variant ${existingVariant.variant_id}:`,
          error
        )
      }
    }
  }
}

export default PackageModuleService
