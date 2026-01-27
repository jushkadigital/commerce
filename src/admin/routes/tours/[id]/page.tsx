import {
  Container,
  Heading,
  Button,
  Input,
  Textarea,
  Label,
  Table,
  Badge,
} from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"

const TourDetailPage = () => {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tour, setTour] = useState<any>(null)
  const [formData, setFormData] = useState({
    destination: "",
    description: "",
    duration_days: 1,
    max_capacity: 10,
  })

  useEffect(() => {
    fetch(`/admin/tours/${id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setTour(data.tour)

        setFormData({
          destination: data.tour.destination,
          description: data.tour.description || "",
          duration_days: data.tour.duration_days,
          max_capacity: data.tour.max_capacity,
        })
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error loading tour:", error)
        setLoading(false)
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/admin/tours/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          destination: formData.destination,
          description: formData.description,
          duration_days: formData.duration_days,
          max_capacity: formData.max_capacity,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTour(data.tour)

        alert("Tour actualizado exitosamente")
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || "No se pudo actualizar el tour"}`)
      }
    } catch (error) {
      console.error("Error updating tour:", error)
      alert("Error al actualizar el tour")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">Cargando...</div>
      </Container>
    )
  }

  if (!tour) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">Tour no encontrado</div>
      </Container>
    )
  }

  return (
    <div className="space-y-4">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1">{tour.destination}</Heading>
            <p className="text-sm text-gray-500 mt-1">ID: {tour.id}</p>
            <div className="flex items-center gap-2 mt-2">
              {tour.product_id ? (
                <>
                  <Badge color="green" size="small">
                    ✓ Producto Sincronizado
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {tour.product_id}
                  </span>
                </>
              ) : (
                <Badge color="red" size="small">
                  Sin producto
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {tour.product_id && (
              <Link to={`/tours/${id}/pricing`}>
                <Button variant="primary">Gestionar Precios</Button>
              </Link>
            )}
            <Link to="/tours">
              <Button variant="secondary">Volver a Tours</Button>
            </Link>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Imagen del tour (solo lectura) */}
          {tour.thumbnail && (
            <div className="mb-6">
              <Label className="mb-2 block">Imagen del Tour</Label>
              <div className="flex items-start gap-4">
                <img
                  src={tour.thumbnail}
                  alt={tour.destination}
                  className="w-48 h-32 object-cover rounded-lg border border-ui-border-base"
                />
                <p className="text-xs text-ui-fg-muted mt-2">
                  Para cambiar la imagen, edita el producto en la sección de Productos.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="destination" className="mb-2 block">
                Destino *
              </Label>
              <Input
                id="destination"
                type="text"
                required
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-2 block">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_days" className="mb-2 block">
                  Duración (días) *
                </Label>
                <Input
                  id="duration_days"
                  type="number"
                  required
                  min="1"
                  value={formData.duration_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_days: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="max_capacity" className="mb-2 block">
                  Capacidad Máxima *
                </Label>
                <Input
                  id="max_capacity"
                  type="number"
                  required
                  min="1"
                  value={formData.max_capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_capacity: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 pb-4 sticky bottom-0 bg-white border-t mt-4 -mx-6 px-6">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Link to="/tours">
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2" className="mb-4">
            Reservas Recientes
          </Heading>
          {tour.bookings && tour.bookings.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Pasajero</Table.HeaderCell>
                  <Table.HeaderCell>Fecha del Tour</Table.HeaderCell>
                  <Table.HeaderCell>Estado</Table.HeaderCell>
                  <Table.HeaderCell>Order ID</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {tour.bookings.slice(0, 10).map((booking: any) => (
                  <Table.Row key={booking.id}>
                    <Table.Cell>{booking.passenger_name}</Table.Cell>
                    <Table.Cell>
                      {new Date(booking.tour_date).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={
                          booking.status === "confirmed"
                            ? "green"
                            : booking.status === "completed"
                            ? "blue"
                            : booking.status === "cancelled"
                            ? "red"
                            : "orange"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="font-mono text-sm">
                      {booking.order_id}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <p className="text-gray-500">No hay reservas aún</p>
          )}
        </div>
      </Container>
    </div>
  )
}

export default TourDetailPage
