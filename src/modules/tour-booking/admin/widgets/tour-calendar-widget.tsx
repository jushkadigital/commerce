import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Badge, ButtonSpinner, toast } from "@medusajs/ui"
import { useAdminQuery } from "@medusajs/framework/react"
import { useState, useEffect } from "react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/es"

dayjs.extend(relativeTime)
dayjs.locale("es")

interface AvailabilityData {
  date: string
  total: number
  booked: number
  available: number
}

interface AvailabilityResponse {
  tour_id: string
  capacity: number
  availability: AvailabilityData[]
}

const AVAILABLE = "available"
const LIMITED = "limited"
const FULL = "full"

function getAvailabilityStatus(available: number, capacity: number): string {
  if (available === 0) return FULL
  const percentage = (available / capacity) * 100
  return percentage >= 20 ? AVAILABLE : LIMITED
}

function getAvailabilityColor(status: string): {
  bg: string
  border: string
  text: string
} {
  switch (status) {
    case AVAILABLE:
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
      }
    case LIMITED:
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
      }
    case FULL:
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
      }
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-700",
      }
  }
}

const TourCalendarWidget = ({ data }: { data: any }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs())
  const [isLoading, setIsLoading] = useState(true)

  // Load availability data
  const { data: availabilityData, error, isLoading: dataLoading } = useAdminQuery<
    AvailabilityResponse,
    Error
  >(
    `/admin/tours/${data?.id || ""}/availability`,
    {
      query: {
        start_date: selectedMonth.startOf("month").format("YYYY-MM-DD"),
        end_date: selectedMonth.endOf("month").format("YYYY-MM-DD"),
      },
    },
    {
      retry: false,
      enabled: !!data?.id,
    }
  )

  useEffect(() => {
    if (!dataLoading) {
      setIsLoading(false)
    }
  }, [dataLoading])

  useEffect(() => {
    if (error) {
      toast.error("Error al cargar disponibilidad", {
        description: error.message || "No se pudieron obtener los datos de disponibilidad",
      })
    }
  }, [error])

  const handlePreviousMonth = () => {
    setSelectedMonth((prev) => prev.subtract(1, "month"))
    setIsLoading(true)
  }

  const handleNextMonth = () => {
    setSelectedMonth((prev) => prev.add(1, "month"))
    setIsLoading(true)
  }

  const handleToday = () => {
    setSelectedMonth(dayjs())
    setIsLoading(true)
  }

  const renderCalendarDays = () => {
    if (!availabilityData) return null

    const currentYear = selectedMonth.year()
    const currentMonth = selectedMonth.month()
    const daysInMonth = dayjs(new Date(currentYear, currentMonth + 1, 0)).date()
    const startDayOfWeek = dayjs(new Date(currentYear, currentMonth, 1)).day()

    const calendarDays = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-10" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = dayjs(new Date(currentYear, currentMonth, day)).format("YYYY-MM-DD")
      const dayAvailability = availabilityData.availability.find(
        (a) => a.date === dateStr
      )

      if (dayAvailability) {
        const status = getAvailabilityStatus(dayAvailability.available, dayAvailability.total)
        const colors = getAvailabilityColor(status)

        calendarDays.push(
          <div
            key={day}
            className={`h-10 rounded-md border-2 ${colors.bg} ${colors.border} ${colors.text} flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-all`}
            title={`${dateStr}: ${dayAvailability.available} disponibles de ${dayAvailability.total}`}
          >
            <span className="text-sm font-medium">{day}</span>
            <span className="text-xs opacity-75">
              {dayAvailability.available > 0 ? dayAvailability.available : "Full"}
            </span>
          </div>
        )
      } else {
        // No data for this day
        calendarDays.push(
          <div
            key={day}
            className="h-10 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-sm"
          >
            <span>{day}</span>
            <span className="text-xs">—</span>
          </div>
        )
      }
    }

    return calendarDays
  }

  return (
    <Container className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h3">Calendario de Disponibilidad</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {selectedMonth.format("MMMM YYYY")}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="small" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="ghost" size="small" onClick={handlePreviousMonth}>
            ←
          </Button>
          <Button variant="ghost" size="small" onClick={handleNextMonth}>
            →
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 border-t border-b border-ui-border-base py-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md bg-emerald-50 border-2 border-emerald-200" />
          <div className="flex flex-col">
            <Text size="small" leading="compact" className="font-medium">
              Disponible
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              >20% capacidad
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md bg-amber-50 border-2 border-amber-200" />
          <div className="flex flex-col">
            <Text size="small" leading="compact" className="font-medium">
              Pocas plazas
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              <20% capacidad
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md bg-red-50 border-2 border-red-200" />
          <div className="flex flex-col">
            <Text size="small" leading="compact" className="font-medium">
              Completo
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              0 disponibles
            </Text>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading || dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <ButtonSpinner />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-ui-fg-subtle">
          <Text size="small" leading="compact">
            No se pudo cargar la disponibilidad
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-ui-fg-subtle py-2">
              {day}
            </div>
          ))}
          {/* Calendar days */}
          {renderCalendarDays()}
        </div>
      )}

      {/* Current status summary */}
      {!dataLoading && availabilityData && (
        <div className="mt-4 rounded-lg border border-ui-border-base p-4 bg-ui-bg-subtle">
          <Text size="small" leading="compact" className="font-medium mb-2">
            Resumen de {selectedMonth.format("MMMM YYYY")}
          </Text>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="small" />
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Disponibles: {availabilityData.availability.filter((a) => a.available > 0).length} días
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="small" />
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Restringidos:{" "}
                {availabilityData.availability.filter((a) => a.available > 0 && a.available < a.total * 0.2).length} días
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="error" size="small" />
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Completos: {availabilityData.availability.filter((a) => a.available === 0).length} días
              </Text>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "tour.details.side",
})

export default TourCalendarWidget
