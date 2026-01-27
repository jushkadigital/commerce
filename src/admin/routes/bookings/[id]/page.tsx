import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Badge,
  Select,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

const BookingDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState("")

  useEffect(() => {
    fetchBooking()
  }, [id])

  const fetchBooking = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/tour-bookings/${id}`, {
        credentials: "include",
      })
      const data = await res.json()
      setBooking(data.booking)
      setNewStatus(data.booking.status)
    } catch (error) {
      console.error("Error loading booking:", error)
      toast.error("Error", {
        description: "No se pudo cargar la reserva",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (newStatus === booking.status) {
      toast.warning("Sin cambios", {
        description: "El estado es el mismo",
      })
      return
    }

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/admin/tour-bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        throw new Error("Failed to update status")
      }

      const data = await res.json()
      setBooking(data.booking)
      toast.success("Estado actualizado", {
        description: `La reserva ahora está ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Error", {
        description: "No se pudo actualizar el estado",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "green"
      case "pending":
        return "orange"
      case "cancelled":
        return "red"
      case "completed":
        return "blue"
      default:
        return "grey"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount / 100)
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Detalle de Reserva</Heading>
        </div>
        <div className="px-6 py-4">Cargando...</div>
      </Container>
    )
  }

  if (!booking) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Detalle de Reserva</Heading>
        </div>
        <div className="px-6 py-4">
          <p className="text-ui-fg-subtle">No se encontró la reserva</p>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate("/bookings")}
            className="mt-4"
          >
            Volver a Reservas
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate("/bookings")}
          >
            ← Volver
          </Button>
          <div>
            <Heading level="h1">Reserva #{booking.id.substring(0, 8)}</Heading>
            <p className="text-sm text-ui-fg-subtle mt-1">
              Creada el {formatDate(booking.created_at)}
            </p>
          </div>
        </div>
        <Badge color={getStatusColor(booking.status)} size="large">
          {booking.status}
        </Badge>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Booking Information */}
            <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base">
              <h2 className="text-lg font-semibold mb-4">
                Información de la Reserva
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-ui-fg-subtle">Pasajero</p>
                  <p className="font-medium">{booking.passenger_name}</p>
                </div>
                {booking.passenger_email && (
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Email</p>
                    <p className="font-medium">{booking.passenger_email}</p>
                  </div>
                )}
                {booking.passenger_phone && (
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Teléfono</p>
                    <p className="font-medium">{booking.passenger_phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-ui-fg-subtle">Tipo de Pasajero</p>
                  <p className="font-medium capitalize">
                    {booking.passenger_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-ui-fg-subtle">Fecha del Tour</p>
                  <p className="font-medium">{formatDate(booking.tour_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-ui-fg-subtle">ID Completo</p>
                  <p className="font-mono text-xs">{booking.id}</p>
                </div>
              </div>
            </div>

            {/* Tour Details */}
            {booking.tour && (
              <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base">
                <h2 className="text-lg font-semibold mb-4">
                  Detalles del Tour
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Destino</p>
                    <p className="font-medium">{booking.tour.destination}</p>
                  </div>
                  {booking.tour.description && (
                    <div>
                      <p className="text-sm text-ui-fg-subtle">Descripción</p>
                      <p className="text-sm">{booking.tour.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Duración</p>
                    <p className="font-medium">
                      {booking.tour.duration_days} día(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-ui-fg-subtle">
                      Capacidad Máxima
                    </p>
                    <p className="font-medium">
                      {booking.tour.max_capacity} pasajeros
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => navigate(`/tours/${booking.tour.id}`)}
                    className="mt-2"
                  >
                    Ver Tour Completo
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order Information */}
            {booking.order ? (
              <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base">
                <h2 className="text-lg font-semibold mb-4">Orden Asociada</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Orden #</p>
                    <p className="font-medium">#{booking.order.display_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Estado de Orden</p>
                    <Badge color="blue">{booking.order.status}</Badge>
                  </div>
                  {booking.order.payment_status && (
                    <div>
                      <p className="text-sm text-ui-fg-subtle">
                        Estado de Pago
                      </p>
                      <Badge color="green">
                        {booking.order.payment_status}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Total</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(
                        booking.order.total,
                        booking.order.currency_code
                      )}
                    </p>
                  </div>
                  {booking.order.customer && (
                    <div>
                      <p className="text-sm text-ui-fg-subtle">Cliente</p>
                      <p className="font-medium">
                        {booking.order.customer.first_name}{" "}
                        {booking.order.customer.last_name}
                      </p>
                      <p className="text-xs text-ui-fg-subtle">
                        {booking.order.customer.email}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-ui-fg-subtle">Creada</p>
                    <p className="text-sm">
                      {formatDate(booking.order.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-ui-fg-subtle">ID Completo</p>
                    <p className="font-mono text-xs">{booking.order.id}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => navigate(`/orders/${booking.order.id}`)}
                    className="mt-2"
                  >
                    Ver Orden Completa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base">
                <h2 className="text-lg font-semibold mb-4">Orden Asociada</h2>
                <p className="text-sm text-ui-fg-subtle">
                  No hay orden asociada a esta reserva
                </p>
              </div>
            )}

            {/* Status Management */}
            <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base">
              <h2 className="text-lg font-semibold mb-4">Gestión de Estado</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-ui-fg-subtle mb-2">
                    Estado Actual
                  </p>
                  <Badge color={getStatusColor(booking.status)} size="large">
                    {booking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-ui-fg-subtle mb-2">
                    Cambiar Estado
                  </p>
                  <Select
                    value={newStatus}
                    onValueChange={(value) => setNewStatus(value)}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Seleccionar estado" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="pending">Pendiente</Select.Item>
                      <Select.Item value="confirmed">Confirmada</Select.Item>
                      <Select.Item value="cancelled">Cancelada</Select.Item>
                      <Select.Item value="completed">Completada</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus || newStatus === booking.status}
                  className="w-full"
                >
                  {updatingStatus ? "Actualizando..." : "Actualizar Estado"}
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base">
              <h2 className="text-lg font-semibold mb-4">Historial</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="font-medium text-sm">Reserva Creada</p>
                    <p className="text-xs text-ui-fg-subtle">
                      {formatDate(booking.created_at)}
                    </p>
                  </div>
                </div>
                {booking.updated_at !== booking.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">
                        Última Actualización
                      </p>
                      <p className="text-xs text-ui-fg-subtle">
                        {formatDate(booking.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Detalle de Reserva",
})

export default BookingDetailPage
