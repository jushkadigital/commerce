import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type GroupedPassengers = {
  adults: number
  children: number
  infants: number
}

const emptyPassengers = (): GroupedPassengers => ({
  adults: 0,
  children: 0,
  infants: 0,
})

const getItemQuantity = (item: Record<string, any>): number => {
  const quantity = Number(item?.quantity)
  if (Number.isFinite(quantity) && quantity > 0) {
    return quantity
  }

  const linePassengers = Number(item?.line_passengers)
  if (Number.isFinite(linePassengers) && linePassengers > 0) {
    return linePassengers
  }

  const passengers = item?.passengers
  if (Array.isArray(passengers) && passengers.length > 0) {
    return passengers.length
  }

  if (passengers && typeof passengers === "object") {
    const passengersCount =
      (Number(passengers.adults) || 0) +
      (Number(passengers.children) || 0) +
      (Number(passengers.infants) || 0)

    if (passengersCount > 0) {
      return passengersCount
    }
  }

  return 1
}

const getPassengersFromItem = (item: Record<string, any>): GroupedPassengers => {
  const passengers = item?.passengers || {}

  return {
    adults: Number(passengers.adults) || 0,
    children: Number(passengers.children) || 0,
    infants: Number(passengers.infants) || 0,
  }
}

const normalizeLineItems = (lineItems: unknown): Record<string, any>[] => {
  if (!lineItems || typeof lineItems !== "object") {
    return []
  }

  const value = lineItems as Record<string, any>
  if (Array.isArray(value.items)) {
    return value.items
  }

  return [value]
}



export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query")


  const filtersSource = {
    ...(req.filterableFields || {}),
  } as Record<string, any>

  const package_date = filtersSource.package_date as
    | { gte?: string; lte?: string }
    | undefined

  delete filtersSource.package_date
  delete filtersSource.type

  const filters: Record<string, any> = { ...filtersSource }


  if (package_date) {
    filters.package_date = {}
    if (package_date.gte) {
      filters.package_date.$gte = package_date.gte
    }
    if (package_date.lte) {
      filters.package_date.$lte = package_date.lte
    }
  }

  const {
    data: packagesBooking,
    metadata
  } = await query.graph({
    entity: "package_booking",
    ...req.queryConfig,
    filters,
  })

  const orderIds = Array.from(
    new Set(
      ((packagesBooking || []) as Record<string, any>[])
        .map((booking) => booking?.order_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  )

  let ordersById = new Map<string, Record<string, any>>()

  if (orderIds.length > 0) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "payment_status",
        "fulfillment_status",
        "total",
        "currency_code",
        "created_at",
        "email",
        "customer.id",
        "customer.first_name",
        "customer.last_name",
        "customer.email",
        "customer.phone",
      ],
      filters: {
        id: orderIds,
      },
    })

    ordersById = new Map(
      ((orders || []) as Record<string, any>[]).map((order) => [order.id, order])
    )
  }

  const grouped = new Map<string, Record<string, any>>()

  for (const booking of (packagesBooking || []) as Record<string, any>[]) {
    const groupId =
      typeof booking?.metadata?.group_id === "string" && booking.metadata.group_id.length > 0
        ? booking.metadata.group_id
        : booking.id

    const lineItems = normalizeLineItems(booking.line_items)
    const order = typeof booking?.order_id === "string"
      ? ordersById.get(booking.order_id) || null
      : null
    const customer = order?.customer || null

    if (!grouped.has(groupId)) {
      const totalQuantity = lineItems.reduce((sum, item) => sum + getItemQuantity(item), 0)
      const passengers = lineItems.reduce((acc, item) => {
        const itemPassengers = getPassengersFromItem(item)
        acc.adults += itemPassengers.adults
        acc.children += itemPassengers.children
        acc.infants += itemPassengers.infants
        return acc
      }, emptyPassengers())

      grouped.set(groupId, {
        ...booking,
        order,
        customer,
        line_items: {
          items: lineItems,
          quantity: totalQuantity,
          passengers,
        },
        booking_ids: [booking.id],
      })
      continue
    }

    const current = grouped.get(groupId)!
    const currentLineItems = normalizeLineItems(current.line_items)
    const mergedItems = [...currentLineItems, ...lineItems]

    const mergedQuantity = mergedItems.reduce((sum, item) => sum + getItemQuantity(item), 0)
    const mergedPassengers = mergedItems.reduce((acc, item) => {
      const itemPassengers = getPassengersFromItem(item)
      acc.adults += itemPassengers.adults
      acc.children += itemPassengers.children
      acc.infants += itemPassengers.infants
      return acc
    }, emptyPassengers())

    grouped.set(groupId, {
      ...current,
      order: current.order || order,
      customer: current.customer || customer,
      line_items: {
        items: mergedItems,
        quantity: mergedQuantity,
        passengers: mergedPassengers,
      },
      booking_ids: [...(current.booking_ids || []), booking.id],
    })
  }

  const groupedBookings = Array.from(grouped.values())

  res.json({
    packages_booking: groupedBookings,
    count: groupedBookings.length,
    limit: metadata?.take,
    offset: metadata?.skip,
    type: "package",
  })
}
