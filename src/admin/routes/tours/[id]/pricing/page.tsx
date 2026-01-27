import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Input,
  Table,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

const TourPricingPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tour, setTour] = useState<any>(null)
  const [prices, setPrices] = useState({
    adult: { PEN: 0, USD: 0 },
    child: { PEN: 0, USD: 0 },
    infant: { PEN: 0, USD: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTourPricing()
  }, [id])

  const fetchTourPricing = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/tours/${id}/pricing`, {
        credentials: "include",
      })
      const data = await res.json()
      setTour(data.tour)
      setPrices(data.prices)
    } catch (error) {
      console.error("Error loading pricing:", error)
      toast.error("Error", {
        description: "No se pudo cargar la información de precios",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePriceChange = (
    passengerType: string,
    currency: string,
    value: string
  ) => {
    const numericValue = parseFloat(value) || 0
    setPrices((prev: any) => ({
      ...prev,
      [passengerType]: {
        ...prev[passengerType],
        [currency]: numericValue,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/admin/tours/${id}/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prices }),
      })

      if (!res.ok) {
        throw new Error("Failed to update prices")
      }

      toast.success("Precios actualizados", {
        description: "Los precios se han actualizado correctamente",
      })

      // Refresh data
      fetchTourPricing()
    } catch (error) {
      console.error("Error updating prices:", error)
      toast.error("Error", {
        description: "No se pudieron actualizar los precios",
      })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount)
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Gestión de Precios</Heading>
        </div>
        <div className="px-6 py-4">Cargando...</div>
      </Container>
    )
  }

  if (!tour) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Gestión de Precios</Heading>
        </div>
        <div className="px-6 py-4">
          <p className="text-ui-fg-subtle">No se encontró el tour</p>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate("/tours")}
            className="mt-4"
          >
            Volver a Tours
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
            onClick={() => navigate(`/tours/${id}`)}
          >
            ← Volver al Tour
          </Button>
          <div>
            <Heading level="h1">Gestión de Precios</Heading>
            <p className="text-sm text-ui-fg-subtle mt-1">
              {tour.destination}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="small"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <div className="px-6 py-6">
        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Ingresa los precios en unidades completas
            (ej: 300 para S/ 300.00). El sistema calcula automáticamente el
            precio en USD usando una tasa de conversión de 0.27.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="bg-ui-bg-subtle rounded-lg border border-ui-border-base overflow-hidden">
          <div className="bg-ui-bg-base px-4 py-3 border-b border-ui-border-base">
            <h2 className="text-lg font-semibold">Precios por Tipo de Pasajero</h2>
          </div>

          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tipo de Pasajero</Table.HeaderCell>
                <Table.HeaderCell>Precio PEN (S/)</Table.HeaderCell>
                <Table.HeaderCell>Precio USD ($)</Table.HeaderCell>
                <Table.HeaderCell>Equivalente PEN</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {/* Adult Row */}
              <Table.Row>
                <Table.Cell>
                  <div>
                    <p className="font-semibold">Adulto</p>
                    <p className="text-xs text-ui-fg-subtle">
                      Pasajero mayor de 12 años
                    </p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.adult.PEN}
                    onChange={(e) =>
                      handlePriceChange("adult", "PEN", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-32"
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.adult.USD}
                    onChange={(e) =>
                      handlePriceChange("adult", "USD", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-32"
                  />
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-ui-fg-subtle">
                    {formatCurrency(prices.adult.PEN, "PEN")}
                  </span>
                </Table.Cell>
              </Table.Row>

              {/* Child Row */}
              <Table.Row>
                <Table.Cell>
                  <div>
                    <p className="font-semibold">Niño</p>
                    <p className="text-xs text-ui-fg-subtle">
                      Pasajero entre 2-12 años
                    </p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.child.PEN}
                    onChange={(e) =>
                      handlePriceChange("child", "PEN", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-32"
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.child.USD}
                    onChange={(e) =>
                      handlePriceChange("child", "USD", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-32"
                  />
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-ui-fg-subtle">
                    {formatCurrency(prices.child.PEN, "PEN")}
                  </span>
                </Table.Cell>
              </Table.Row>

              {/* Infant Row */}
              <Table.Row>
                <Table.Cell>
                  <div>
                    <p className="font-semibold">Infante</p>
                    <p className="text-xs text-ui-fg-subtle">
                      Pasajero menor de 2 años
                    </p>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.infant.PEN}
                    onChange={(e) =>
                      handlePriceChange("infant", "PEN", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-32"
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.infant.USD}
                    onChange={(e) =>
                      handlePriceChange("infant", "USD", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-32"
                  />
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-ui-fg-subtle">
                    {formatCurrency(prices.infant.PEN, "PEN")}
                  </span>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>

        {/* Price Calculation Info */}
        <div className="mt-6 bg-ui-bg-subtle rounded-lg p-4 border border-ui-border-base">
          <h3 className="font-semibold mb-3">Cálculo de Precios</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Soles (PEN)</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-ui-fg-subtle">Adulto:</span>
                  <span className="font-medium">
                    {formatCurrency(prices.adult.PEN, "PEN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-fg-subtle">Niño:</span>
                  <span className="font-medium">
                    {formatCurrency(prices.child.PEN, "PEN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-fg-subtle">Infante:</span>
                  <span className="font-medium">
                    {formatCurrency(prices.infant.PEN, "PEN")}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Dólares (USD)</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-ui-fg-subtle">Adulto:</span>
                  <span className="font-medium">
                    {formatCurrency(prices.adult.USD, "USD")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-fg-subtle">Niño:</span>
                  <span className="font-medium">
                    {formatCurrency(prices.child.USD, "USD")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-fg-subtle">Infante:</span>
                  <span className="font-medium">
                    {formatCurrency(prices.infant.USD, "USD")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Features */}
        <div className="mt-6 bg-ui-bg-subtle rounded-lg p-4 border border-ui-border-base">
          <h3 className="font-semibold mb-2 text-sm">
            Funcionalidades Futuras
          </h3>
          <ul className="space-y-1 text-sm text-ui-fg-subtle">
            <li className="flex items-start gap-2">
              <span className="text-ui-fg-muted">•</span>
              <span>
                Price Lists: Precios especiales por temporada (alta/baja)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ui-fg-muted">•</span>
              <span>
                Historial de cambios: Ver todas las modificaciones de precios
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ui-fg-muted">•</span>
              <span>Descuentos por grupo: Precios especiales para grupos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ui-fg-muted">•</span>
              <span>
                Multi-moneda dinámica: Actualización automática de tasas de
                cambio
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Precios",
  icon: CurrencyDollar,
})

export default TourPricingPage
