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
import { useMemo, useState } from "react"
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

      ;(acc[dateKey] ||= []).push(booking)
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
                
                const days = []
                
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

                    // Helper to generate stable tab value
                    const getTabValue = (b: any, idx: number) => 
                      b.id ? String(b.id) : `${b.bookingType}-${b.order_id || 'no-order'}-${idx}`

                    // Default to first booking
                    const defaultTabValue = getTabValue(bookings[0], 0)

                    return (
                      <Tabs key={dateKey} defaultValue={defaultTabValue} className="flex flex-col h-full overflow-hidden">
                        <div className="overflow-x-auto pb-2 shrink-0">
                          <Tabs.List>
                            {bookings.map((booking: any, idx: number) => {
                              const value = getTabValue(booking, idx)
                              const orderLabel = booking.order_id 
                                ? `Pedido ${booking.order_id.slice(-6).toUpperCase()}` 
                                : 'Sin Pedido'
                              // Add index to ensure distinct visual labels if multiple bookings exist
                              const label = bookings.length > 1 ? `${orderLabel} (${idx + 1})` : orderLabel

                              return (
                                <Tabs.Trigger key={value} value={value} className="whitespace-nowrap">
                                  {label}
                                </Tabs.Trigger>
                              )
                            })}
                          </Tabs.List>
                        </div>

                        <div className="flex-1 overflow-y-auto mt-4 pr-1">
                          {bookings.map((booking: any, idx: number) => {
                            const value = getTabValue(booking, idx)
                            const data = booking.tour || booking.package
                            const typeLabel = booking.bookingType === 'tour' ? 'Tour' : 'Paquete'
                            
                            return (
                              <Tabs.Content key={value} value={value} className="flex flex-col gap-4 h-full">
                                <div className="space-y-3 flex-1">
                                  <div className="p-3 bg-ui-bg-subtle rounded border border-ui-border-base flex justify-between items-start">
                                    <div className="flex flex-col gap-1">
                                      <Text size="small" weight="plus" className="text-ui-fg-base">
                                        {data?.destination || 'Sin destino'}
                                      </Text>
                                      <Text size="xsmall" className="text-ui-fg-subtle">
                                        {data?.duration_days ? `${data.duration_days} días` : 'Duración N/A'}
                                      </Text>
                                    </div>
                                    <div className="px-2 py-0.5 bg-ui-bg-base rounded border border-ui-border-base">
                                      <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                                        {typeLabel}
                                      </Text>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 mt-auto">
                                  <Button 
                                    variant="secondary" 
                                    className="w-full"
                                    onClick={() => {
                                      setSelectedBooking({
                                        type: booking.order_id || 'Sin Pedido',
                                        bookingType: booking.bookingType, 
                                        fecha: dateKey,
                                        items: [booking]
                                      })
                                      setIsModalOpen(true)
                                    }}
                                  >
                                    Ver Detalles Completos
                                  </Button>
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
              <h2 className="text-xl font-semibold">
                {selectedBooking.bookingType === "tour" ? "Tour" : "Package"} - Reserva
              </h2>
              <button onClick={handleCloseModal} className="text-ui-fg-muted hover:text-ui-fg-base">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Text className="text-ui-fg-subtle text-small font-medium">Pedido</Text>
                <Text className="text-ui-fg-base">{selectedBooking.type}</Text>
              </div>

              <div>
                <Text className="text-ui-fg-subtle text-small font-medium">Fecha</Text>
                <Text className="text-ui-fg-base">
                  {dayjs(selectedBooking.fecha as string).format("DD/MM/YYYY")}
                </Text>
              </div>

              {selectedBooking.items && selectedBooking.items.length > 0 && (
                <div>
                  <Text className="text-ui-fg-subtle text-small font-medium mb-2 block">Detalles</Text>
                  <div className="space-y-2">
                    {selectedBooking.items.map((item: any, index: number) => {
                      const data = item.tour || item.package
                      return (
                        <div key={index} className="p-3 bg-ui-bg-subtle rounded">
                          <div className="font-medium">{data?.destination}</div>
                          <div className="text-small text-ui-fg-subtle">
                            Duración: {data?.duration_days} días
                          </div>
                        </div>
                      )
                    })}
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
