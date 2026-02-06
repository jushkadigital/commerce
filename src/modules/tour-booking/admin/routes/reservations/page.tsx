import { Container, Heading, Table, Button, Badge, DatePicker, Input, Select, Toaster, toast } from "@medusajs/ui"
import { useAdminQuery } from "@medusajs/framework/react"
import { useState, useMemo } from "react"
import dayjs from "dayjs"
import { Link } from "react-router-dom"

interface TourBooking {
  id: string
  tour_id: string
  tour_date: string
  status: "confirmed" | "pending" | "cancelled"
  total_passengers: number
  total_price: number
  customer_email?: string
  customer_name?: string
  tour?: {
    destination: string
  }
  created_at: string
}

export default function ReservationsPage() {
  const [filters, setFilters] = useState({
    tour_id: "",
    start_date: "",
    end_date: "",
    status: "",
  })

  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  // Fetch bookings
  const { data: bookingsData, isLoading } = useAdminQuery<{
    tour_bookings: TourBooking[]
    count: number
  }>(
    "/admin/tour-bookings",
    {
      query: {
        ...filters,
        skip: currentPage * pageSize,
        take: pageSize,
        order: "-created_at",
      },
    }
  )

  const bookings = bookingsData?.tour_bookings || []
  const totalCount = bookingsData?.count || 0

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
    const totalPassengers = bookings.reduce((sum, b) => sum + (b.total_passengers || 0), 0)
    const confirmedCount = bookings.filter((b) => b.status === "confirmed").length
    const pendingCount = bookings.filter((b) => b.status === "pending").length

    return {
      totalRevenue,
      totalPassengers,
      confirmedCount,
      pendingCount,
    }
  }, [bookings])

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["ID", "Tour", "Fecha", "Cliente", "Email", "Pasajeros", "Total", "Estado", "Creado"]
    const rows = bookings.map((b) => [
      b.id,
      b.tour?.destination || "N/A",
      dayjs(b.tour_date).format("YYYY-MM-DD"),
      b.customer_name || "N/A",
      b.customer_email || "N/A",
      b.total_passengers,
      b.total_price,
      b.status,
      dayjs(b.created_at).format("YYYY-MM-DD HH:mm"),
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reservas-${dayjs().format("YYYY-MM-DD")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success("Exportación completada", {
      description: `${bookings.length} reservas exportadas`,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge color="green">Confirmada</Badge>
      case "pending":
        return <Badge color="orange">Pendiente</Badge>
      case "cancelled":
        return <Badge color="red">Cancelada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <Container className="flex flex-col gap-6 p-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Reservas</Heading>
          <p className="text-ui-fg-subtle text-sm">
            Gestiona todas las reservas de tours
          </p>
        </div>
        <Button variant="secondary" onClick={exportToCSV}>
          Exportar CSV
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle text-sm">Total Reservas</p>
          <p className="text-2xl font-semibold">{totalCount}</p>
        </div>
        <div className="p-4 border rounded-lg bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle text-sm">Ingresos</p>
          <p className="text-2xl font-semibold">${metrics.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle text-sm">Pasajeros</p>
          <p className="text-2xl font-semibold">{metrics.totalPassengers}</p>
        </div>
        <div className="p-4 border rounded-lg bg-ui-bg-subtle">
          <p className="text-ui-fg-subtle text-sm">Confirmadas</p>
          <p className="text-2xl font-semibold text-green-600">{metrics.confirmedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 border rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ui-fg-subtle">Desde</label>
          <DatePicker
            value={filters.start_date}
            onChange={(date) => setFilters({ ...filters, start_date: date })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ui-fg-subtle">Hasta</label>
          <DatePicker
            value={filters.end_date}
            onChange={(date) => setFilters({ ...filters, end_date: date })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ui-fg-subtle">Estado</label>
          <Select
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            options={[
              { label: "Todos", value: "" },
              { label: "Confirmadas", value: "confirmed" },
              { label: "Pendientes", value: "pending" },
              { label: "Canceladas", value: "cancelled" },
            ]}
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="secondary"
            onClick={() => {
              setFilters({ tour_id: "", start_date: "", end_date: "", status: "" })
              setCurrentPage(0)
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Tour</Table.HeaderCell>
            <Table.HeaderCell>Fecha</Table.HeaderCell>
            <Table.HeaderCell>Cliente</Table.HeaderCell>
            <Table.HeaderCell>Pasajeros</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Estado</Table.HeaderCell>
            <Table.HeaderCell>Creado</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell colSpan={7} className="text-center py-8">
                Cargando...
              </Table.Cell>
            </Table.Row>
          ) : bookings.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={7} className="text-center py-8 text-ui-fg-subtle">
                No se encontraron reservas
              </Table.Cell>
            </Table.Row>
          ) : (
            bookings.map((booking) => (
              <Table.Row key={booking.id}>
                <Table.Cell>
                  <Link
                    to={`/tours/${booking.tour_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {booking.tour?.destination || "N/A"}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  {dayjs(booking.tour_date).format("DD/MM/YYYY")}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col">
                    <span>{booking.customer_name || "N/A"}</span>
                    <span className="text-sm text-ui-fg-subtle">
                      {booking.customer_email}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell>{booking.total_passengers}</Table.Cell>
                <Table.Cell>${booking.total_price?.toLocaleString()}</Table.Cell>
                <Table.Cell>{getStatusBadge(booking.status)}</Table.Cell>
                <Table.Cell>
                  {dayjs(booking.created_at).format("DD/MM/YYYY HH:mm")}
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ui-fg-subtle">
          Mostrando {bookings.length} de {totalCount} reservas
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            disabled={(currentPage + 1) * pageSize >= totalCount}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </Container>
  )
}
