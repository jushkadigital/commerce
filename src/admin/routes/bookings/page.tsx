import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar as CalendarIcon } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Popover,
  Text,
  clx,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import "dayjs/locale/es"
import utc from "dayjs/plugin/utc"
import { type ReactNode, useMemo, useState } from "react"

import { sdk } from "../../lib/sdk"

dayjs.locale("es")
dayjs.extend(utc)

type BookingKind = "tour" | "package"

type PassengerBreakdown = {
  adults?: number
  children?: number
  infants?: number
}

type PassengerEntry = {
  type?: string
}

type BookingLineItem = {
  title?: string
  quantity?: number
  line_passengers?: number
  passengers?: PassengerBreakdown | PassengerEntry[]
}

type BookingEntity = {
  destination?: string | null
  duration_days?: number | null
}

type CustomerSummary = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

type OrderSummary = {
  id: string
  display_id?: number | null
  status?: string | null
  payment_status?: string | null
  fulfillment_status?: string | null
  created_at?: string | null
  email?: string | null
  customer?: CustomerSummary | null
}

type BookingMetadata = {
  group_id?: string
  preData?: unknown
  tour_date?: string
  package_date?: string
}

type BookingLineItems = {
  items?: BookingLineItem[]
  quantity?: number
  passengers?: PassengerBreakdown
}

type ApiBooking = {
  id: string
  order_id?: string | null
  bookingType: BookingKind
  metadata?: BookingMetadata
  line_items?: BookingLineItems | BookingLineItem
  tour?: BookingEntity | null
  package?: BookingEntity | null
  order?: OrderSummary | null
  customer?: CustomerSummary | null
  tour_date?: string | null
  package_date?: string | null
  status?: string | null
}

type TourBookingsResponse = {
  tours_booking?: Omit<ApiBooking, "bookingType">[]
}

type PackageBookingsResponse = {
  packages_booking?: Omit<ApiBooking, "bookingType">[]
}

type ReservationOrderRow = {
  key: string
  orderId: string | null
  displayId: number | null
  orderLabel: string
  createdAt: string | null
  customerName: string | null
  customerEmail: string | null
  destinations: string[]
  types: BookingKind[]
  dates: string[]
  earliestDate: string | null
  latestDate: string | null
  totalPassengers: number
  bookingsCount: number
  status: string | null
  items: ApiBooking[]
}

type SelectedReservation = {
  orderLabel: string
  dates: string[]
  items: ApiBooking[]
}

function getBookingDateKey(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (typeof value === "string") {
    const [datePart] = value.split("T")
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart
    }
  }

  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) {
    return null
  }

  const parsed = dayjs.utc(value)
  if (!parsed.isValid()) {
    return null
  }

  return parsed.format("YYYY-MM-DD")
}

function getBookingScheduleDate(booking: ApiBooking): string | null {
  const source =
    booking.bookingType === "tour"
      ? booking.metadata?.tour_date ?? booking.tour_date
      : booking.metadata?.package_date ?? booking.package_date

  return getBookingDateKey(source)
}

function getVariantGroupId(booking: ApiBooking, fallback: string): string {
  const fromMetadata = booking.metadata?.group_id
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return fromMetadata
  }

  return fallback
}

function getBookingLineItems(booking: ApiBooking): BookingLineItem[] {
  const lineItems = booking.line_items

  if (!lineItems) {
    return []
  }

  if ("items" in lineItems && Array.isArray(lineItems.items)) {
    return lineItems.items
  }

  return [lineItems]
}

function getBookingQuantity(booking: ApiBooking): number {
  const lineItems = booking.line_items
  if (lineItems && "quantity" in lineItems) {
    const lineQuantity = Number(lineItems.quantity)
    if (Number.isFinite(lineQuantity) && lineQuantity > 0) {
      return lineQuantity
    }
  }

  const items = getBookingLineItems(booking)
  const itemsQuantity = items.reduce((total, item) => total + getLineItemQuantity(item), 0)

  return itemsQuantity > 0 ? itemsQuantity : 1
}

function getBookingEntity(booking: ApiBooking): BookingEntity | null {
  return booking.bookingType === "tour" ? booking.tour ?? null : booking.package ?? null
}

function getBookingDestination(booking: ApiBooking): string {
  return getBookingEntity(booking)?.destination?.trim() || "Sin destino"
}

function getCustomerName(customer?: CustomerSummary | null): string | null {
  if (!customer) {
    return null
  }

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim()
  return name || null
}

function getOrderLabel(orderId: string | null, fallback: string): string {
  if (orderId) {
    return `Pedido ${orderId}`
  }

  return `Reserva ${fallback.slice(-6).toUpperCase()}`
}

function getLineItemQuantity(item: BookingLineItem): number {
  const directQuantity = Number(item.quantity)
  if (Number.isFinite(directQuantity) && directQuantity > 0) {
    return directQuantity
  }

  const linePassengers = Number(item.line_passengers)
  if (Number.isFinite(linePassengers) && linePassengers > 0) {
    return linePassengers
  }

  if (Array.isArray(item.passengers) && item.passengers.length > 0) {
    return item.passengers.length
  }

  if (item.passengers && typeof item.passengers === "object") {
    const groupedPassengers = item.passengers as PassengerBreakdown
    const passengersCount =
      (Number(groupedPassengers.adults) || 0) +
      (Number(groupedPassengers.children) || 0) +
      (Number(groupedPassengers.infants) || 0)

    if (passengersCount > 0) {
      return passengersCount
    }
  }

  return 0
}

function getPassengerLabel(rawType: string): string {
  const normalized = rawType.trim().toLowerCase()

  if (normalized === "adult" || normalized === "adults") {
    return "Adult"
  }

  if (normalized === "child" || normalized === "children") {
    return "Child"
  }

  if (normalized === "infant" || normalized === "infants") {
    return "Infant"
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function addVariantCount(map: Map<string, number>, label: string | undefined, quantity: number) {
  if (!label || quantity <= 0) {
    return
  }

  const normalizedLabel = label.trim()
  if (!normalizedLabel) {
    return
  }

  map.set(normalizedLabel, (map.get(normalizedLabel) || 0) + quantity)
}

function getVariantComposition(booking: ApiBooking): Array<{ label: string; quantity: number }> {
  const composition = new Map<string, number>()

  getBookingLineItems(booking).forEach((lineItem) => {
    const lineItemTitle =
      typeof lineItem.title === "string" && lineItem.title.trim().length > 0
        ? lineItem.title.trim()
        : undefined

    const lineItemQuantity = getLineItemQuantity(lineItem)

    if (lineItemTitle) {
      addVariantCount(composition, lineItemTitle, lineItemQuantity)
      return
    }

    if (Array.isArray(lineItem.passengers) && lineItem.passengers.length > 0) {
      const perType = lineItem.passengers.reduce<Record<string, number>>((acc, passenger) => {
        const type =
          typeof passenger.type === "string" && passenger.type.trim().length > 0
            ? getPassengerLabel(passenger.type)
            : "Passenger"

        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})

      Object.entries(perType).forEach(([type, quantity]) => {
        addVariantCount(composition, type, quantity)
      })

      return
    }

    if (lineItem.passengers && typeof lineItem.passengers === "object") {
      const groupedPassengers = lineItem.passengers as PassengerBreakdown
      addVariantCount(composition, "Adult", Number(groupedPassengers.adults) || 0)
      addVariantCount(composition, "Child", Number(groupedPassengers.children) || 0)
      addVariantCount(composition, "Infant", Number(groupedPassengers.infants) || 0)
    }
  })

  return Array.from(composition.entries()).map(([label, quantity]) => ({ label, quantity }))
}

function stringifyPreData(preData: unknown): string | null {
  if (preData === null || preData === undefined) {
    return null
  }

  if (typeof preData === "string") {
    try {
      const parsed = JSON.parse(preData)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return JSON.stringify(preData)
    }
  }

  try {
    return JSON.stringify(preData, null, 2)
  } catch {
    return JSON.stringify(String(preData))
  }
}

function formatReservationDates(dates: string[]): string {
  if (dates.length === 0) {
    return "Sin fecha"
  }

  const sortedDates = [...dates].sort()
  const firstDate = sortedDates[0]
  const lastDate = sortedDates[sortedDates.length - 1]

  if (!lastDate || firstDate === lastDate) {
    return dayjs(firstDate).format("DD/MM/YYYY")
  }

  return `${dayjs(firstDate).format("DD/MM/YYYY")} → ${dayjs(lastDate).format("DD/MM/YYYY")}`
}

const BookingListPage = () => {
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<SelectedReservation | null>(null)
  const [orderIdFilter, setOrderIdFilter] = useState("")
  const [destinationFilter, setDestinationFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | BookingKind>("all")

  const handlePrevMonth = () => setCurrentMonth((prev) => prev.subtract(1, "month"))
  const handleNextMonth = () => setCurrentMonth((prev) => prev.add(1, "month"))
  const handleToday = () => setCurrentMonth(dayjs())

  const { data: tourData, isLoading: tourLoading } = useQuery<TourBookingsResponse>({
    queryKey: ["tour-bookings", "all"],
    queryFn: () =>
      sdk.client.fetch<TourBookingsResponse>("/admin/bookings", {
        query: {
          limit: 1000,
          offset: 0,
        },
      }),
  })

  const { data: packageData, isLoading: packageLoading } = useQuery<PackageBookingsResponse>({
    queryKey: ["package-bookings", "all"],
    queryFn: () =>
      sdk.client.fetch<PackageBookingsResponse>("/admin/package-bookings", {
        query: {
          limit: 1000,
          offset: 0,
        },
      }),
  })

  const isLoading = tourLoading || packageLoading

  const allBookings = useMemo<ApiBooking[]>(() => {
    const tours = (tourData?.tours_booking || []).map((booking) => ({
      ...booking,
      bookingType: "tour" as const,
    }))
    const packages = (packageData?.packages_booking || []).map((booking) => ({
      ...booking,
      bookingType: "package" as const,
    }))

    return [...tours, ...packages]
  }, [packageData?.packages_booking, tourData?.tours_booking])

  const bookingsByDate = useMemo<Record<string, ApiBooking[]>>(() => {
    return allBookings.reduce<Record<string, ApiBooking[]>>((acc, booking) => {
      const dateKey = getBookingScheduleDate(booking)

      if (!dateKey) {
        return acc
      }

      if (!acc[dateKey]) {
        acc[dateKey] = []
      }

      acc[dateKey].push(booking)
      return acc
    }, {})
  }, [allBookings])

  const orderRows = useMemo<ReservationOrderRow[]>(() => {
    const grouped = new Map<string, ReservationOrderRow>()

    allBookings.forEach((booking, index) => {
      const order = booking.order ?? null
      const orderId = booking.order_id ?? order?.id ?? null
      const rowKey = orderId || `booking-${booking.id || index}`
      const dateKey = getBookingScheduleDate(booking)
      const destination = getBookingDestination(booking)
      const customer = booking.customer ?? order?.customer ?? null

      if (!grouped.has(rowKey)) {
        grouped.set(rowKey, {
          key: rowKey,
          orderId,
          displayId: typeof order?.display_id === "number" ? order.display_id : null,
          orderLabel: getOrderLabel(orderId, rowKey),
          createdAt: order?.created_at ?? null,
          customerName: getCustomerName(customer),
          customerEmail: customer?.email ?? order?.email ?? null,
          destinations: destination === "Sin destino" ? [] : [destination],
          types: [booking.bookingType],
          dates: dateKey ? [dateKey] : [],
          earliestDate: dateKey,
          latestDate: dateKey,
          totalPassengers: getBookingQuantity(booking),
          bookingsCount: 1,
          status: order?.status ?? booking.status ?? null,
          items: [booking],
        })
        return
      }

      const current = grouped.get(rowKey)

      if (!current) {
        return
      }

      current.items.push(booking)
      current.bookingsCount += 1
      current.totalPassengers += getBookingQuantity(booking)

      if (destination !== "Sin destino" && !current.destinations.includes(destination)) {
        current.destinations.push(destination)
      }

      if (!current.types.includes(booking.bookingType)) {
        current.types.push(booking.bookingType)
      }

      if (dateKey && !current.dates.includes(dateKey)) {
        current.dates.push(dateKey)
        current.earliestDate = !current.earliestDate || dateKey < current.earliestDate ? dateKey : current.earliestDate
        current.latestDate = !current.latestDate || dateKey > current.latestDate ? dateKey : current.latestDate
      }

      if (!current.customerName) {
        current.customerName = getCustomerName(customer)
      }

      if (!current.customerEmail) {
        current.customerEmail = customer?.email ?? order?.email ?? null
      }

      if (!current.createdAt) {
        current.createdAt = order?.created_at ?? null
      }

      if (!current.status) {
        current.status = order?.status ?? booking.status ?? null
      }
    })

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        destinations: [...row.destinations].sort((left, right) => left.localeCompare(right)),
        dates: [...row.dates].sort(),
        types: [...row.types].sort(),
      }))
      .sort((left, right) => {
        const rightDate = right.latestDate || right.createdAt || ""
        const leftDate = left.latestDate || left.createdAt || ""
        return rightDate.localeCompare(leftDate)
      })
  }, [allBookings])

  const ordersByDate = useMemo<Record<string, ReservationOrderRow[]>>(() => {
    return orderRows.reduce<Record<string, ReservationOrderRow[]>>((acc, row) => {
      row.dates.forEach((dateKey) => {
        if (!acc[dateKey]) {
          acc[dateKey] = []
        }

        acc[dateKey].push(row)
      })

      return acc
    }, {})
  }, [orderRows])

  const filteredOrderRows = useMemo(() => {
    const normalizedOrderIdFilter = orderIdFilter.trim().toLowerCase()
    const normalizedDestinationFilter = destinationFilter.trim().toLowerCase()
    const selectedDateKey = selectedDate?.format("YYYY-MM-DD") || null

    return orderRows.filter((row) => {
      const matchesOrderId =
        normalizedOrderIdFilter.length === 0 ||
        row.orderLabel.toLowerCase().includes(normalizedOrderIdFilter) ||
        row.orderId?.toLowerCase().includes(normalizedOrderIdFilter) ||
        String(row.displayId || "").includes(normalizedOrderIdFilter)

      const matchesDestination =
        normalizedDestinationFilter.length === 0 ||
        row.destinations.some((destination) => destination.toLowerCase().includes(normalizedDestinationFilter))

      const matchesType = typeFilter === "all" || row.types.includes(typeFilter)

      const matchesDate = !selectedDateKey || row.dates.includes(selectedDateKey)

      return matchesOrderId && matchesDestination && matchesType && matchesDate
    })
  }, [destinationFilter, orderIdFilter, orderRows, selectedDate, typeFilter])

  const selectedDayOrders = useMemo(() => {
    if (!selectedDate) {
      return []
    }

    const selectedDateKey = selectedDate.format("YYYY-MM-DD")

    return filteredOrderRows.filter((row) => row.dates.includes(selectedDateKey)).slice(0, 4)
  }, [filteredOrderRows, selectedDate])

  const selectedReservationGroups = useMemo(() => {
    if (!selectedReservation?.items.length) {
      return [] as Array<{ groupId: string; items: ApiBooking[]; totalQuantity: number }>
    }

    return Object.values(
      selectedReservation.items.reduce<Record<string, { groupId: string; items: ApiBooking[]; totalQuantity: number }>>(
        (acc, item, index) => {
          const groupId = getVariantGroupId(item, `booking-group-${index}`)

          if (!acc[groupId]) {
            acc[groupId] = {
              groupId,
              items: [],
              totalQuantity: 0,
            }
          }

          acc[groupId].items.push(item)
          acc[groupId].totalQuantity += getBookingQuantity(item)

          return acc
        },
        {}
      )
    )
  }, [selectedReservation])

  const selectedCustomer = useMemo(() => {
    if (!selectedReservation?.items.length) {
      return {
        name: null,
        email: null,
        phone: null,
      }
    }

    const firstBookingWithCustomer = selectedReservation.items.find(
      (item) => item.customer || item.order?.customer || item.order?.email
    )

    const customer = firstBookingWithCustomer?.customer || firstBookingWithCustomer?.order?.customer || null
    const name = getCustomerName(customer)

    return {
      name,
      email: customer?.email ?? firstBookingWithCustomer?.order?.email ?? null,
      phone: customer?.phone ?? null,
    }
  }, [selectedReservation])

  const selectedPreDataString = useMemo(() => {
    if (!selectedReservation?.items.length) {
      return null
    }

    const firstBookingWithPreData = selectedReservation.items.find(
      (item) => item.metadata?.preData !== null && item.metadata?.preData !== undefined
    )

    if (!firstBookingWithPreData) {
      return null
    }

    return stringifyPreData(firstBookingWithPreData.metadata?.preData)
  }, [selectedReservation])

  const modalTitle = useMemo(() => {
    if (!selectedReservation?.items.length) {
      return "Reserva"
    }

    const hasTour = selectedReservation.items.some((item) => item.bookingType === "tour")
    const hasPackage = selectedReservation.items.some((item) => item.bookingType === "package")

    if (hasTour && hasPackage) {
      return "Reserva"
    }

    if (hasTour) {
      return "Tour - Reserva"
    }

    if (hasPackage) {
      return "Package - Reserva"
    }

    return "Reserva"
  }, [selectedReservation])

  const bookingsCount = allBookings.length
  const reservationsCount = orderRows.length

  const clearFilters = () => {
    setOrderIdFilter("")
    setDestinationFilter("")
    setTypeFilter("all")
    setSelectedDate(null)
  }

  const openReservationDetail = (row: ReservationOrderRow) => {
    setSelectedReservation({
      orderLabel: row.orderLabel,
      dates: row.dates,
      items: row.items,
    })
  }

  const renderCalendarDays = () => {
    const year = currentMonth.year()
    const month = currentMonth.month()
    const daysInMonth = currentMonth.daysInMonth()
    const firstDayOfMonth = dayjs(new Date(year, month, 1)).day()
    const startOffset = (firstDayOfMonth + 6) % 7
    const days: ReactNode[] = []

    for (let index = 0; index < startOffset; index += 1) {
      days.push(
        <div
          key={`empty-${index}`}
          className="min-h-[3.25rem] rounded-md border border-transparent bg-ui-bg-subtle/40"
        />
      )
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = dayjs(new Date(year, month, day))
      const dateKey = date.format("YYYY-MM-DD")
      const dayBookings = bookingsByDate[dateKey] || []
      const dayOrders = ordersByDate[dateKey] || []
      const isSelected = selectedDate?.isSame(date, "day")
      const isToday = dayjs().isSame(date, "day")

      days.push(
        <button
          key={dateKey}
          type="button"
          onClick={() => setSelectedDate(isSelected ? null : date)}
          className={clx(
            "flex min-h-[3.25rem] flex-col rounded-md border p-1.5 text-left transition-colors",
            isSelected
              ? "border-ui-border-interactive bg-ui-bg-base shadow-borders-interactive-with-focus"
              : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle-hover",
            isToday && !isSelected && "bg-ui-bg-subtle"
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <Text
              size="xsmall"
              leading="compact"
              weight="plus"
              className={clx(isSelected ? "text-ui-fg-interactive" : "text-ui-fg-base")}
            >
              {day}
            </Text>
            {dayOrders.length > 0 ? (
              <span className="rounded-full bg-ui-tag-blue-bg px-1.5 py-0.5 text-[10px] font-medium text-ui-tag-blue-text">
                {dayOrders.length}
              </span>
            ) : null}
          </div>
          <div className="mt-auto flex gap-1">
            {dayBookings.slice(0, 3).map((booking, index) => (
              <span
                key={`${dateKey}-${booking.id}-${index}`}
                className={clx(
                  "h-1.5 w-1.5 rounded-full",
                  booking.bookingType === "tour" ? "bg-ui-tag-blue-icon" : "bg-ui-tag-orange-icon"
                )}
              />
            ))}
          </div>
        </button>
      )
    }

    return days
  }

  return (
    <div className="flex h-full w-full flex-col gap-y-6">
      <Container className="p-0 overflow-hidden">
        <div className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h1">Reservas</Heading>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Vista principal de orders con {reservationsCount} registros y {bookingsCount} reservas agrupadas.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge color="grey" size="small">
              Orders: {filteredOrderRows.length}
            </Badge>
            <Badge color="blue" size="small">
              Tours: {filteredOrderRows.filter((row) => row.types.includes("tour")).length}
            </Badge>
            <Badge color="orange" size="small">
              Packages: {filteredOrderRows.filter((row) => row.types.includes("package")).length}
            </Badge>
          </div>
        </div>
      </Container>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 2xl:col-span-9">
          <Container className="p-0 overflow-hidden">
            <div className="border-b border-ui-border-base px-6 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-y-1">
                  <Text size="small" leading="compact" weight="plus">
                    Filtros de búsqueda
                  </Text>
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    Busca por order id, destino o filtra por tipo de reserva.
                  </Text>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                  <Input
                    placeholder="Buscar por order id"
                    value={orderIdFilter}
                    onChange={(event) => setOrderIdFilter(event.target.value)}
                  />
                  <Input
                    placeholder="Filtrar por destino"
                    value={destinationFilter}
                    onChange={(event) => setDestinationFilter(event.target.value)}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="small"
                      variant={typeFilter === "all" ? "primary" : "secondary"}
                      onClick={() => setTypeFilter("all")}
                    >
                      Todos
                    </Button>
                    <Button
                      size="small"
                      variant={typeFilter === "tour" ? "primary" : "secondary"}
                      onClick={() => setTypeFilter("tour")}
                    >
                      Tours
                    </Button>
                    <Button
                      size="small"
                      variant={typeFilter === "package" ? "primary" : "secondary"}
                      onClick={() => setTypeFilter("package")}
                    >
                      Packages
                    </Button>
                  </div>

                  <Button size="small" variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                </div>

                {selectedDate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="blue" size="small">
                      Fecha activa: {selectedDate.format("DD/MM/YYYY")}
                    </Badge>
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      El calendario también está filtrando la lista principal.
                    </Text>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col divide-y divide-ui-border-base">
              {isLoading ? (
                <div className="flex items-center justify-center px-6 py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-fg-interactive border-t-transparent" />
                </div>
              ) : filteredOrderRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                  <Text size="small" leading="compact" weight="plus">
                    No encontramos reservas con esos filtros
                  </Text>
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    Ajusta el order id, el destino o el tipo para volver a mostrar resultados.
                  </Text>
                </div>
              ) : (
                filteredOrderRows.map((row) => {
                  const destinationSummary =
                    row.destinations.length > 0 ? row.destinations.join(" • ") : "Sin destino"

                  return (
                    <div key={row.key} className="px-6 py-4 transition-colors hover:bg-ui-bg-subtle-hover/60">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Text size="small" leading="compact" weight="plus">
                              {row.orderLabel}
                            </Text>
                            {row.status ? (
                              <Badge color="grey" size="small">
                                {row.status}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <div className="flex flex-col gap-y-1">
                              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                                Cliente
                              </Text>
                              <Text size="small" leading="compact" weight="plus">
                                {row.customerName || row.customerEmail || "No disponible"}
                              </Text>
                            </div>

                            <div className="flex flex-col gap-y-1">
                              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                                Destino
                              </Text>
                              <Text size="small" leading="compact" weight="plus">
                                {destinationSummary}
                              </Text>
                            </div>

                            <div className="flex flex-col gap-y-1">
                              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                                Fechas
                              </Text>
                              <Text size="small" leading="compact" weight="plus">
                                {formatReservationDates(row.dates)}
                              </Text>
                            </div>
                          </div>
                        </div>

                        <div className="flex min-w-[15rem] flex-col items-start gap-3 xl:items-end">
                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            {row.types.map((type) => (
                              <Badge key={`${row.key}-${type}`} color={type === "tour" ? "blue" : "orange"} size="small">
                                {type === "tour" ? "Tour" : "Package"}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex flex-col gap-y-1 xl:items-end">
                            <Text size="small" leading="compact" className="text-ui-fg-subtle">
                              {row.bookingsCount} reservas • {row.totalPassengers} pasajeros
                            </Text>
                            <Button size="small" variant="secondary" onClick={() => openReservationDetail(row)}>
                              Ver detalle
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Container>
        </div>

        <div className="xl:col-span-4 2xl:col-span-3">
          <div className="flex flex-col gap-6 xl:sticky xl:top-4">
            <Container className="p-0 overflow-hidden">
              <div className="border-b border-ui-border-base px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-y-1">
                    <Text size="small" leading="compact" weight="plus">
                      Calendario
                    </Text>
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      Vista compacta para ubicar días con reservas.
                    </Text>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button size="small" variant="secondary" onClick={handleToday}>
                      Hoy
                    </Button>
                    <Button size="small" variant="secondary" onClick={handlePrevMonth}>
                      ←
                    </Button>
                    <Button size="small" variant="secondary" onClick={handleNextMonth}>
                      →
                    </Button>
                  </div>
                </div>

                <Text size="small" leading="compact" weight="plus" className="mt-3 block text-center">
                  {currentMonth.format("MMMM YYYY")}
                </Text>
              </div>

              <div className="px-4 py-4">
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                    <Text
                      key={`${day}-${index}`}
                      size="xsmall"
                      leading="compact"
                      className="py-1 text-center text-ui-fg-subtle"
                    >
                      {day}
                    </Text>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
              </div>
            </Container>

            <Container className="p-0 overflow-hidden">
              <div className="border-b border-ui-border-base px-4 py-4">
                <Text size="small" leading="compact" weight="plus">
                  {selectedDate ? `Pedidos del ${selectedDate.format("DD/MM/YYYY")}` : "Uso rápido"}
                </Text>
              </div>

              <div className="px-4 py-4">
                {selectedDate ? (
                  selectedDayOrders.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {selectedDayOrders.map((row) => (
                        <div key={`selected-day-${row.key}`} className="rounded-md border border-ui-border-base p-3">
                          <Text size="small" leading="compact" weight="plus">
                            {row.orderLabel}
                          </Text>
                          <Text size="small" leading="compact" className="text-ui-fg-subtle">
                            {row.destinations.join(" • ") || "Sin destino"}
                          </Text>
                          <Button
                            className="mt-3"
                            size="small"
                            variant="secondary"
                            onClick={() => openReservationDetail(row)}
                          >
                            Abrir detalle
                          </Button>
                        </div>
                      ))}
                      {selectedDate &&
                      filteredOrderRows.filter((row) => row.dates.includes(selectedDate.format("YYYY-MM-DD"))).length >
                        selectedDayOrders.length ? (
                        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                          Hay más pedidos para esta fecha en la lista principal filtrada.
                        </Text>
                      ) : null}
                    </div>
                  ) : (
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      No hay pedidos para la fecha seleccionada.
                    </Text>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      Selecciona un día para filtrar la lista principal y abrir pedidos directamente desde el calendario.
                    </Text>
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      El foco principal sigue estando en la lista de orders de la izquierda.
                    </Text>
                  </div>
                )}
              </div>
            </Container>
          </div>
        </div>
      </div>

      {selectedReservation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2">{modalTitle}</Heading>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {selectedReservation.orderLabel}
                </Text>
              </div>

              <Button size="small" variant="secondary" onClick={() => setSelectedReservation(null)}>
                Cerrar
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    Pedido
                  </Text>
                  <Text size="small" leading="compact" weight="plus">
                    {selectedReservation.orderLabel}
                  </Text>

                  <Text size="small" leading="compact" className="mt-3 text-ui-fg-subtle">
                    Fechas
                  </Text>
                  <Text size="small" leading="compact" weight="plus">
                    {formatReservationDates(selectedReservation.dates)}
                  </Text>
                </div>

                <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    Cliente
                  </Text>
                  <Text size="small" leading="compact" weight="plus">
                    {selectedCustomer.name || selectedCustomer.email || "No disponible"}
                  </Text>
                  {selectedCustomer.email ? (
                    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                      {selectedCustomer.email}
                    </Text>
                  ) : null}
                  {selectedCustomer.phone ? (
                    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                      Tel: {selectedCustomer.phone}
                    </Text>
                  ) : null}

                  {selectedPreDataString ? (
                    <div className="mt-3">
                      <Popover>
                        <Popover.Trigger asChild>
                          <Button size="small" variant="secondary">
                            Ver preData
                          </Button>
                        </Popover.Trigger>
                        <Popover.Content
                          sideOffset={8}
                          align="start"
                          className="max-h-[360px] w-[min(92vw,560px)] overflow-auto"
                        >
                          <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                            metadata.preData
                          </Text>
                          <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-ui-bg-subtle p-2 text-xs text-ui-fg-subtle">
                            {selectedPreDataString}
                          </pre>
                        </Popover.Content>
                      </Popover>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <Text size="small" leading="compact" weight="plus" className="mb-2 block">
                  Detalles
                </Text>

                <div className="space-y-3">
                  {selectedReservationGroups.map((variantGroup, groupIndex) => (
                    <div
                      key={`modal-group-${variantGroup.groupId}-${groupIndex}`}
                      className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Text size="xsmall" leading="compact" weight="plus" className="text-ui-fg-subtle">
                          Grupo {variantGroup.groupId.slice(-10).toUpperCase()}
                        </Text>
                        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                          Cantidad total: {variantGroup.totalQuantity}
                        </Text>
                      </div>

                      <div className="space-y-2">
                        {variantGroup.items.map((item, index) => {
                          const bookingEntity = getBookingEntity(item)
                          const quantity = getBookingQuantity(item)
                          const variantComposition = getVariantComposition(item)
                          const reservationDate = getBookingScheduleDate(item)

                          return (
                            <div
                              key={`modal-group-item-${variantGroup.groupId}-${item.id}-${index}`}
                              className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Text size="small" leading="compact" weight="plus">
                                  {bookingEntity?.destination || "Sin destino"}
                                </Text>
                                <Badge color={item.bookingType === "tour" ? "blue" : "orange"} size="small">
                                  {item.bookingType === "tour" ? "Tour" : "Package"}
                                </Badge>
                              </div>

                              <Text size="xsmall" leading="compact" className="mt-1 text-ui-fg-subtle">
                                {reservationDate ? `Fecha: ${dayjs(reservationDate).format("DD/MM/YYYY")}` : "Fecha: N/A"}
                              </Text>
                              <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                                Cantidad: {quantity}
                              </Text>
                              <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                                {bookingEntity?.duration_days
                                  ? `Duración: ${bookingEntity.duration_days} días`
                                  : "Duración: N/A"}
                              </Text>

                              {variantComposition.length > 0 ? (
                                <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                                  Variantes: {variantComposition.map((variant) => `${variant.label} ${variant.quantity}`).join(", ")}
                                </Text>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Reservas",
  icon: CalendarIcon,
})

export default BookingListPage
