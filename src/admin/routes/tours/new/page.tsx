import { Container, Heading, Button, Input, Textarea, Label } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"

const NewTourPage = () => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    destination: "",
    description: "",
    duration_days: 1,
    max_capacity: 10,
  })
  const queryClient = useQueryClient()


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await sdk.client.fetch("/admin/tours", {
        method: "POST",
        body: JSON.stringify({
          destination: formData.destination,
          description: formData.description,
          duration_days: formData.duration_days,
          max_capacity: formData.max_capacity,
          available_dates: [],
          prices: {
            adult: 0,
            child: 0,
            infant: 0,
          },
        }),
      })

      queryClient.invalidateQueries({ queryKey: ["tours"] })

    } catch (error) {
      console.error("Error creating tour:", error)
      alert("Error al crear el tour")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Crear Nuevo Tour</Heading>
        <Link to="/tours">
          <Button variant="secondary">Cancelar</Button>
        </Link>
      </div>

      <div className="px-6 py-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Creación Automática de Producto:</strong> Al crear este tour, se generará automáticamente un producto en Medusa con tres variantes (Adulto, Niño, Infante). Los precios iniciales serán $0. Después de crear el tour, usa el botón "Gestionar Precios" para establecer los precios en múltiples monedas.
          </p>
        </div>

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
              placeholder="Machu Picchu, Peru"
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
              placeholder="Descripción del tour..."
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
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Creando..." : "Crear Tour"}
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
  )
}

export default NewTourPage
