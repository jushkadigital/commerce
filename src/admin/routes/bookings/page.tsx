import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar as CalendarIcon } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Button,
  clx,
  Tabs,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState, type ReactNode } from "react"
import { sdk } from "../../lib/sdk"
import { Booking } from "../../types"
import dayjs from "dayjs"
import "dayjs/locale/es"
import utc from "dayjs/plugin/utc"

dayjs.locale("es")
dayjs.extend(utc)

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

  const parsed = dayjs.utc(value as string | number | Date)
  if (!parsed.isValid()) {
    return null
  }

  return parsed.format("YYYY-MM-DD")
}

function getVariantGroupId(booking: any, fallback: string): string {
  const fromMetadata = booking?.metadata?.group_id
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return fromMetadata
  }

  return fallback
}

function getBookingQuantity(booking: any): number {
  const lineQuantity = Number(booking?.line_items?.quantity)
  if (Number.isFinite(lineQuantity) && lineQuantity > 0) {
    return lineQuantity
  }

  const metadataQuantity = Number(booking?.metadata?.line_passengers)
  if (Number.isFinite(metadataQuantity) && metadataQuantity > 0) {
    return metadataQuantity
  }

  const passengers = booking?.line_items?.passengers
  if (Array.isArray(passengers) && passengers.length > 0) {
    return passengers.length
  }

  return 1
}

function shortGroupLabel(groupId: string): string {
  return groupId.length > 10 ? groupId.slice(-10).toUpperCase() : groupId.toUpperCase()
}

type VariantGroupSummary = {
  groupId: string
  items: any[]
  totalQuantity: number
}

type VariantComposition = {
  label: string
  quantity: number
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

function addVariantCount(
  map: Map<string, number>,
  label: string | undefined,
  quantity: number
) {
  if (!label || quantity <= 0) {
    return
  }

  const normalizedLabel = label.trim()
  if (!normalizedLabel) {
    return
  }

  map.set(normalizedLabel, (map.get(normalizedLabel) || 0) + quantity)
}

function getLineItemQuantity(item: any): number {
  const directQuantity = Number(item?.quantity)
  if (Number.isFinite(directQuantity) && directQuantity > 0) {
    return directQuantity
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

  return 0
}

function getVariantComposition(booking: any): VariantComposition[] {
  const lineItemsSource = booking?.line_items
  const lineItems = Array.isArray(lineItemsSource?.items)
    ? lineItemsSource.items
    : lineItemsSource && typeof lineItemsSource === "object"
      ? [lineItemsSource]
      : []

  const composition = new Map<string, number>()

  lineItems.forEach((lineItem: any) => {
    const lineItemTitle =
      typeof lineItem?.title === "string" && lineItem.title.trim().length > 0
        ? lineItem.title.trim()
        : undefined
    const lineItemQuantity = getLineItemQuantity(lineItem)

    if (lineItemTitle) {
      addVariantCount(composition, lineItemTitle, lineItemQuantity)
      return
    }

    const passengers = lineItem?.passengers
    if (Array.isArray(passengers) && passengers.length > 0) {
      const perType = passengers.reduce((acc: Record<string, number>, passenger: any) => {
        const type =
          typeof passenger?.type === "string" && passenger.type.trim().length > 0
            ? getPassengerLabel(passenger.type)
            : "Passenger"
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})

        ; (Object.entries(perType) as Array<[string, number]>).forEach(([type, quantity]) => {
          addVariantCount(composition, type, quantity)
        })

      return
    }

    if (passengers && typeof passengers === "object") {
      addVariantCount(composition, "Adult", Number(passengers.adults) || 0)
      addVariantCount(composition, "Child", Number(passengers.children) || 0)
      addVariantCount(composition, "Infant", Number(passengers.infants) || 0)
    }
  })

  if (composition.size === 0) {
    const groupedPassengers = booking?.line_items?.passengers
    if (groupedPassengers && typeof groupedPassengers === "object") {
      addVariantCount(composition, "Adult", Number(groupedPassengers.adults) || 0)
      addVariantCount(composition, "Child", Number(groupedPassengers.children) || 0)
      addVariantCount(composition, "Infant", Number(groupedPassengers.infants) || 0)
    }
  }

  return Array.from(composition.entries()).map(([label, quantity]) => ({ label, quantity }))
}

const BookingListPage = () => {
  // Removed unused pagination state for now, as we fetch for the whole month
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<null | Booking>(null)
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null)

  // Calendar navigation
  const handlePrevMonth = () => setCurrentMonth(prev => prev.subtract(1, 'month'))
  const handleNextMonth = () => setCurrentMonth(prev => prev.add(1, 'month'))
  const handleToday = () => {
    const today = dayjs()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  const handleDateClick = (date: dayjs.Dayjs) => {
    setSelectedDate(date)
  }

  // Removed unused offset memo

  const startOfMonth = useMemo(() => currentMonth.startOf('month').format('YYYY-MM-DD'), [currentMonth])
  const endOfMonth = useMemo(() => currentMonth.endOf('month').format('YYYY-MM-DD'), [currentMonth])

  const { data: tourData, isLoading: tourLoading } = useQuery({
    queryKey: ["tour-booking", "month", currentMonth.format("YYYY-MM")],
    queryFn: () => sdk.client.fetch("/admin/bookings", {
      query: {
        limit: 1000,
        offset: 0,
        type: "tour",
        tour_date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),
  })

  const { data: packageData, isLoading: packageLoading } = useQuery({
    queryKey: ["package-booking", "month", currentMonth.format("YYYY-MM")],
    queryFn: () => sdk.client.fetch("/admin/package-bookings", {
      query: {
        limit: 1000,
        offset: 0,
        package_date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),
  })

  console.log(tourData)
  console.log(packageData)
  const isLoading = tourLoading || packageLoading

  const bookingsByDate = useMemo(() => {
    const allBookings = [
      ...((tourData as any)?.tours_booking ?? []).map((b: any) => ({ ...b, bookingType: 'tour' })),
      ...((packageData as any)?.packages_booking ?? []).map((b: any) => ({ ...b, bookingType: 'package' }))
    ]

    return allBookings.reduce((acc, booking) => {
      const dateValue = booking.bookingType === "tour"
        ? booking.metadata?.tour_date ?? booking.tour_date
        : booking.metadata?.package_date ?? booking.package_date

      const dateKey = getBookingDateKey(dateValue)
      if (!dateKey) {
        return acc
      }

      ; (acc[dateKey] ||= []).push(booking)
      return acc
    }, {} as Record<string, any[]>)
  }, [tourData, packageData])

  // Filter out bookings not in current month (just in case API returns more)
  const currentMonthBookings = useMemo(() => {
    const monthPrefix = currentMonth.format("YYYY-MM")
    return Object.keys(bookingsByDate)
      .filter(dateKey => dateKey.startsWith(monthPrefix))
      .reduce((obj, key) => {
        obj[key] = bookingsByDate[key]
        return obj
      }, {} as Record<string, any[]>)
  }, [bookingsByDate, currentMonth])

  const bookingsCount = Object.values(currentMonthBookings).flat().length

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  const modalTitle = useMemo(() => {
    if (!selectedBooking?.items?.length) {
      return "Reserva"
    }

    const hasTour = selectedBooking.items.some(
      (item: any) => item?.bookingType === "tour"
    )
    const hasPackage = selectedBooking.items.some(
      (item: any) => item?.bookingType === "package"
    )

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
  }, [selectedBooking])

  const selectedVariantGroups = useMemo(() => {
    if (!selectedBooking?.items?.length) {
      return [] as VariantGroupSummary[]
    }

    return Object.values(
      (selectedBooking.items as any[]).reduce(
        (acc: Record<string, VariantGroupSummary>, item: any, idx: number) => {
          const groupId = getVariantGroupId(item, `booking-group-${idx}`)

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
    ) as VariantGroupSummary[]
  }, [selectedBooking])

  const selectedCustomer = useMemo(() => {
    if (!selectedBooking?.items?.length) {
      return {
        name: null,
        email: null,
        phone: null,
      }
    }

    const firstBookingWithCustomer = (selectedBooking.items as any[]).find(
      (item) => item?.customer || item?.order?.customer
    )

    const customer = firstBookingWithCustomer?.customer || firstBookingWithCustomer?.order?.customer
    const order = firstBookingWithCustomer?.order || null
    const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ")
    const email = customer?.email || order?.email || null
    const phone =
      customer?.phone ||
      order?.shipping_address?.phone ||
      order?.billing_address?.phone ||
      null

    return {
      name: name || null,
      email,
      phone,
    }
  }, [selectedBooking])

  return (
    <div className="flex flex-col gap-y-2 h-full w-full">
      <Container className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Reservas ({bookingsCount})</Heading>
        </div>
      </Container>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        <div className="lg:col-span-8 h-full">
          <Container className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <Heading level="h2">Calendario</Heading>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="small" onClick={handleToday}>Hoy</Button>
                <Button variant="secondary" size="small" onClick={handlePrevMonth}>←</Button>
                <Text size="small" weight="plus" className="min-w-[100px] text-center">
                  {currentMonth.format("MMMM YYYY")}
                </Text>
                <Button variant="secondary" size="small" onClick={handleNextMonth}>→</Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-ui-fg-subtle py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 auto-rows-fr overflow-y-auto">
              {isLoading ? (
                <div className="col-span-7 flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-fg-interactive border-t-transparent" />
                </div>
              ) : (() => {
                const year = currentMonth.year()
                const month = currentMonth.month()
                const daysInMonth = currentMonth.daysInMonth()
                const firstDayOfMonth = dayjs(new Date(year, month, 1)).day()

                // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0)
                const startOffset = (firstDayOfMonth + 6) % 7

                const days: ReactNode[] = []

                // Empty slots
                for (let i = 0; i < startOffset; i++) {
                  days.push(<div key={`empty-${i}`} className="min-h-[80px] bg-ui-bg-subtle/30 rounded-md" />)
                }

                // Days
                for (let i = 1; i <= daysInMonth; i++) {
                  const date = dayjs(new Date(year, month, i))
                  const isSelected = selectedDate?.isSame(date, 'day')
                  const isToday = date.isSame(dayjs(), 'day')

                  const dateKey = date.format("YYYY-MM-DD")
                  const hasBookings = !!bookingsByDate[dateKey]

                  days.push(
                    <div
                      key={i}
                      onClick={() => handleDateClick(date)}
                      className={clx(
                        "min-h-[80px] p-2 rounded-md border cursor-pointer transition-all hover:bg-ui-bg-subtle-hover flex flex-col gap-1 relative",
                        isSelected
                          ? "border-ui-border-interactive ring-1 ring-ui-border-interactive bg-ui-bg-base"
                          : "border-ui-border-base bg-ui-bg-base",
                        isToday && !isSelected && "bg-ui-bg-subtle"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={clx(
                          "text-small font-medium rounded-full w-6 h-6 flex items-center justify-center",
                          isSelected ? "bg-ui-fg-interactive text-white" : "text-ui-fg-base",
                          isToday && !isSelected && "bg-ui-bg-interactive text-ui-fg-interactive"
                        )}>
                          {i}
                        </span>
                        {hasBookings && (
                          <div className="w-2 h-2 rounded-full bg-ui-fg-interactive" />
                        )}
                      </div>
                    </div>
                  )
                }
                return days
              })()}
            </div>

          </Container>
        </div>

        <div className="lg:col-span-4 h-full">
          <Container className="h-full flex flex-col">
            <Heading level="h2" className="mb-4">Detalles del dia</Heading>
            {selectedDate ? (
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="pb-4 border-b border-ui-border-base shrink-0">
                  <Text size="large" weight="plus" className="text-ui-fg-base">
                    {selectedDate.format("dddd, D [de] MMMM")}
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {selectedDate.format("YYYY")}
                  </Text>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {(() => {
                    const dateKey = selectedDate.format("YYYY-MM-DD")
                    const bookings = bookingsByDate[dateKey] || []

                    if (bookings.length === 0) {
                      return (
                        <div className="flex-1 flex items-center justify-center p-8 text-center bg-ui-bg-subtle rounded-lg border border-dashed border-ui-border-base">
                          <Text className="text-ui-fg-subtle">
                            No hay reservas para este día
                          </Text>
                        </div>
                      )
                    }

                    type BookingGroup = {
                      orderId: string | null
                      items: any[]
                    }

                    const groupedBookings: BookingGroup[] = Object.values(
                      (bookings as any[]).reduce((acc: Record<string, BookingGroup>, booking: any, idx: number) => {
                        const key = booking.order_id
                          ? `order:${booking.order_id}`
                          : `booking:${booking.id || idx}`

                        if (!acc[key]) {
                          acc[key] = {
                            orderId: booking.order_id || null,
                            items: [],
                          }
                        }

                        acc[key].items.push(booking)

                        return acc
                      }, {} as Record<string, BookingGroup>)
                    )

                    const getTabValue = (
                      group: { orderId: string | null; items: any[] },
                      idx: number
                    ) => group.orderId || group.items[0]?.id || `group-${idx}`

                    const defaultTabValue = getTabValue(groupedBookings[0], 0)

                    return (
                      <Tabs key={dateKey} defaultValue={defaultTabValue} className="flex flex-col h-full overflow-hidden">
                        <div className="overflow-x-auto pb-2 shrink-0">
                          <Tabs.List>
                            {groupedBookings.map((group, idx) => {
                              const value = getTabValue(group, idx)
                              const orderLabel = group.orderId
                                ? `Pedido ${group.orderId.slice(-6).toUpperCase()}`
                                : "Sin Pedido"
                              const label = `${orderLabel} (${group.items.length})`

                              return (
                                <Tabs.Trigger key={value} value={value} className="whitespace-nowrap">
                                  {label}
                                </Tabs.Trigger>
                              )
                            })}
                          </Tabs.List>
                        </div>

                        <div className="flex-1 overflow-y-auto mt-4 pr-1">
                          {groupedBookings.map((group, idx) => {
                            const value = getTabValue(group, idx)

                            type VariantGroup = {
                              groupId: string
                              items: any[]
                              totalQuantity: number
                            }

                            const variantsByGroup: VariantGroup[] = Object.values(
                              (group.items as any[]).reduce(
                                (acc: Record<string, VariantGroup>, booking: any, itemIdx: number) => {
                                  const groupId = getVariantGroupId(
                                    booking,
                                    `${value}-group-${itemIdx}`
                                  )

                                  if (!acc[groupId]) {
                                    acc[groupId] = {
                                      groupId,
                                      items: [],
                                      totalQuantity: 0,
                                    }
                                  }

                                  acc[groupId].items.push(booking)
                                  acc[groupId].totalQuantity += getBookingQuantity(booking)

                                  return acc
                                },
                                {} as Record<string, VariantGroup>
                              )
                            )

                            return (
                              <Tabs.Content key={value} value={value} className="flex flex-col gap-4 h-36 data-[state=inactive]:hidden">
                                <div className="space-y-3 flex-1">
                                  {variantsByGroup.map((variantGroup, groupIdx) => (
                                    <div
                                      key={`${value}-variant-group-${groupIdx}`}
                                      className="p-3 bg-ui-bg-subtle rounded border border-ui-border-base"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                                          Grupo {shortGroupLabel(variantGroup.groupId)}
                                        </Text>
                                        <Text size="xsmall" className="text-ui-fg-subtle">
                                          Cantidad total: {variantGroup.totalQuantity}
                                        </Text>
                                      </div>

                                      <div className="space-y-2">
                                        {variantGroup.items.map((booking: any, itemIdx: number) => {
                                          const data = booking.tour || booking.package
                                          const typeLabel =
                                            booking.bookingType === "tour" ? "Tour" : "Paquete"
                                          const quantity = getBookingQuantity(booking)

                                          return (
                                            <div
                                              key={`${value}-group-${groupIdx}-item-${itemIdx}`}
                                              className="flex justify-between items-start cursor-pointer rounded-md px-2 py-1 -mx-2 hover:bg-ui-bg-base"
                                              onClick={() => {
                                                setSelectedBooking({
                                                  type: booking.order_id || "Sin Pedido",
                                                  bookingType: booking.bookingType,
                                                  fecha: dateKey,
                                                  items: [booking],
                                                })
                                                setIsModalOpen(true)
                                              }}
                                            >
                                              <div className="flex flex-col gap-1">
                                                <Text size="small" weight="plus" className="text-ui-fg-base">
                                                  {data?.destination || "Sin destino"}
                                                </Text>
                                                <Text size="xsmall" className="text-ui-fg-subtle">
                                                  {data?.duration_days
                                                    ? `${data.duration_days} días`
                                                    : "Duración N/A"}
                                                </Text>
                                              </div>
                                              <div className="text-right">
                                                <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                                                  {typeLabel}
                                                </Text>
                                                <Text size="xsmall" className="text-ui-fg-subtle">
                                                  Cant: {quantity}
                                                </Text>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </Tabs.Content>
                            )
                          })}
                        </div>
                      </Tabs>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-ui-border-base rounded-lg flex items-center justify-center bg-ui-bg-subtle p-4 text-center">
                <Text className="text-ui-fg-subtle">
                  Seleccione una fecha en el calendario para ver los detalles
                </Text>
              </div>
            )}
          </Container>
        </div>
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">{modalTitle}</h2>
              <button onClick={handleCloseModal} className="text-ui-fg-muted hover:text-ui-fg-base">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-ui-bg-subtle rounded border border-ui-border-base">
                  <Text className="text-ui-fg-subtle text-small font-medium">Pedido</Text>
                  <Text className="text-ui-fg-base">{selectedBooking.type}</Text>

                  <Text className="text-ui-fg-subtle text-small font-medium mt-3">Fecha</Text>
                  <Text className="text-ui-fg-base">
                    {dayjs(selectedBooking.fecha as string).format("DD/MM/YYYY")}
                  </Text>
                </div>

                <div className="p-3 bg-ui-bg-subtle rounded border border-ui-border-base">
                  <Text className="text-ui-fg-subtle text-small font-medium">Cliente</Text>
                  <>
                    <Text className="text-ui-fg-base">{selectedCustomer.name || selectedCustomer.email || "No disponible"}</Text>
                    {selectedCustomer.email && (
                      <Text size="xsmall" className="text-ui-fg-subtle">{selectedCustomer.email}</Text>
                    )}
                    {selectedCustomer.phone && (
                      <Text size="xsmall" className="text-ui-fg-subtle">Tel: {selectedCustomer.phone}</Text>
                    )}
                  </>
                </div>
              </div>

              {selectedBooking.items && selectedBooking.items.length > 0 && (
                <div>
                  <Text className="text-ui-fg-subtle text-small font-medium mb-2 block">Detalles</Text>
                  <div className="space-y-2">
                    {selectedVariantGroups.map((variantGroup, groupIdx) => (
                      <div key={`modal-group-${groupIdx}`} className="p-3 bg-ui-bg-subtle rounded">
                        <div className="flex items-center justify-between mb-2">
                          <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                            Grupo {shortGroupLabel(variantGroup.groupId)}
                          </Text>
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Cantidad total: {variantGroup.totalQuantity}
                          </Text>
                        </div>

                        <div className="space-y-2">
                          {variantGroup.items.map((item: any, index: number) => {
                            const data = item.tour || item.package
                            const quantity = getBookingQuantity(item)
                            const variantComposition = getVariantComposition(item)

                            return (
                              <div key={`modal-group-item-${groupIdx}-${index}`} className="border-t border-ui-border-base pt-2 first:border-t-0 first:pt-0">
                                <div className="flex items-center justify-between">
                                  <Text size="small" weight="plus">{data?.destination || "Sin destino"}</Text>
                                  <Text size="xsmall" className="text-ui-fg-subtle">Cant: {quantity}</Text>
                                </div>
                                {variantComposition.length > 0 && (
                                  <Text size="xsmall" className="text-ui-fg-subtle">
                                    Variantes: {variantComposition.map((v) => `${v.label} ${v.quantity}`).join(", ")}
                                  </Text>
                                )}
                                <Text size="xsmall" className="text-ui-fg-subtle">
                                  {data?.duration_days ? `Duración: ${data.duration_days} días` : "Duración: N/A"}
                                </Text>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Reservas",
  icon: CalendarIcon,
})

export default BookingListPage
