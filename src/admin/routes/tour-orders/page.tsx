import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingCart } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Table,
  Badge,
  Input,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

const TourOrdersPage = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/tour-orders`, {
        credentials: "include",
      })
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error("Error loading tour orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount / 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "green"
      case "pending":
        return "orange"
      case "canceled":
      case "cancelled":
        return "red"
      case "confirmed":
        return "blue"
      default:
        return "grey"
    }
  }

  const getBookingStatusSummary = (bookings: any[]) => {
    if (!bookings || bookings.length === 0) return "Sin reservas"

    const statusCounts = bookings.reduce((acc: any, booking: any) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {})

    const parts = Object.entries(statusCounts).map(
      ([status, count]) => `${count} ${status}`
    )
    return parts.join(", ")
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.display_id?.toString().includes(query) ||
      order.customer?.email?.toLowerCase().includes(query) ||
      order.customer?.first_name?.toLowerCase().includes(query) ||
      order.customer?.last_name?.toLowerCase().includes(query) ||
      order.id?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Órdenes con Tours</Heading>
        </div>
        <div className="px-6 py-4">Cargando...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Órdenes con Tours</Heading>
        <Button
          variant="secondary"
          size="small"
          onClick={() => fetchOrders()}
        >
          Actualizar
        </Button>
      </div>

      <div className="px-6 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-ui-bg-subtle rounded-lg p-4 border border-ui-border-base">
            <div className="text-sm text-ui-fg-subtle mb-1">
              Total Órdenes
            </div>
            <div className="text-2xl font-semibold">{orders.length}</div>
          </div>
          <div className="bg-ui-bg-subtle rounded-lg p-4 border border-ui-border-base">
            <div className="text-sm text-ui-fg-subtle mb-1">
              Total Pasajeros
            </div>
            <div className="text-2xl font-semibold">
              {orders.reduce((sum, order) => sum + (order.total_passengers || 0), 0)}
            </div>
          </div>
          <div className="bg-ui-bg-subtle rounded-lg p-4 border border-ui-border-base">
            <div className="text-sm text-ui-fg-subtle mb-1">Tours Únicos</div>
            <div className="text-2xl font-semibold">
              {orders.reduce((sum, order) => sum + (order.tours_count || 0), 0)}
            </div>
          </div>
          <div className="bg-ui-bg-subtle rounded-lg p-4 border border-ui-border-base">
            <div className="text-sm text-ui-fg-subtle mb-1">
              Ingresos Totales
            </div>
            <div className="text-xl font-semibold">
              {orders.length > 0
                ? formatCurrency(
                    orders.reduce((sum, order) => sum + (order.total || 0), 0),
                    orders[0]?.currency_code || "PEN"
                  )
                : "S/ 0.00"}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Buscar por Order #, Cliente, o Email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-96"
          />
        </div>

        {/* Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ui-fg-subtle mb-4">
              {searchQuery
                ? "No se encontraron órdenes con la búsqueda"
                : "No hay órdenes con tours registradas"}
            </p>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Orden #</Table.HeaderCell>
                <Table.HeaderCell>Cliente</Table.HeaderCell>
                <Table.HeaderCell>Tours</Table.HeaderCell>
                <Table.HeaderCell>Pasajeros</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Estado Orden</Table.HeaderCell>
                <Table.HeaderCell>Estado Reservas</Table.HeaderCell>
                <Table.HeaderCell>Fecha</Table.HeaderCell>
                <Table.HeaderCell>Acciones</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredOrders.map((order: any) => (
                <Table.Row key={order.id}>
                  <Table.Cell className="font-mono">
                    #{order.display_id}
                  </Table.Cell>
                  <Table.Cell>
                    {order.customer ? (
                      <div>
                        <div className="font-medium">
                          {order.customer.first_name} {order.customer.last_name}
                        </div>
                        <div className="text-xs text-ui-fg-subtle">
                          {order.customer.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-ui-fg-subtle">Sin cliente</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {order.tour_items && order.tour_items.length > 0 ? (
                      <div>
                        <div className="font-medium">
                          {order.tours_count} tour(s)
                        </div>
                        <div className="text-xs text-ui-fg-subtle">
                          {Array.from(
                            new Set(
                              order.tour_items.map(
                                (item: any) => item.tour_destination
                              )
                            )
                          )
                            .slice(0, 2)
                            .join(", ")}
                          {order.tours_count > 2 &&
                            ` +${order.tours_count - 2} más`}
                        </div>
                      </div>
                    ) : (
                      <span className="text-ui-fg-subtle">N/A</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="font-medium">
                      {order.total_passengers || 0}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="font-medium">
                      {formatCurrency(order.total, order.currency_code)}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="text-xs">
                      {getBookingStatusSummary(order.bookings)}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="text-sm">
                      {formatDate(order.created_at)}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      Ver Orden
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Órdenes con Tours",
  icon: ShoppingCart,
})

export default TourOrdersPage
