import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BoltSolid } from "@medusajs/icons"
import { Container, Heading, Button, Badge } from "@medusajs/ui"
import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

const WorkflowDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchExecution()
  }, [id])

  const fetchExecution = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/workflows/executions/${id}`, {
        credentials: "include",
      })
      const data = await res.json()
      setMessage(data.message || "")
    } catch (error) {
      console.error("Error loading workflow execution:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Detalle de Workflow</Heading>
        </div>
        <div className="px-6 py-4">Cargando...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate("/workflows")}
          >
            ← Volver
          </Button>
          <div>
            <Heading level="h1">Detalle de Ejecución</Heading>
            <p className="text-sm text-ui-fg-subtle mt-1 font-mono">
              ID: {id}
            </p>
          </div>
        </div>
        <Badge color="orange" size="small">
          Próximamente
        </Badge>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Info Card */}
          <div className="bg-ui-bg-subtle rounded-lg p-6 border border-ui-border-base mb-6">
            <div className="flex justify-center mb-4">
              <BoltSolid className="w-12 h-12 text-ui-fg-subtle" />
            </div>
            <h2 className="text-lg font-semibold mb-3 text-center">
              Vista Detallada de Workflow
            </h2>
            <p className="text-ui-fg-subtle text-center mb-4">{message}</p>
          </div>

          {/* Mock Timeline Preview */}
          <div className="bg-ui-bg-subtle rounded-lg border border-ui-border-base overflow-hidden">
            <div className="bg-ui-bg-base px-4 py-3 border-b border-ui-border-base">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Timeline de Ejecución (Demo)
                </span>
                <Badge color="grey" size="small">
                  Vista Previa
                </Badge>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
                    1
                  </div>
                  <div className="w-0.5 h-12 bg-ui-border-base" />
                </div>
                <div className="flex-1 bg-ui-bg-base rounded-lg p-4 border border-ui-border-base">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">
                      Extract Tour Data
                    </h3>
                    <Badge color="green" size="small">
                      Completado
                    </Badge>
                  </div>
                  <p className="text-xs text-ui-fg-subtle mb-2">
                    Extrae información de tours de los line items de la orden
                  </p>
                  <div className="flex gap-4 text-xs text-ui-fg-muted">
                    <span>Duración: 0.3s</span>
                    <span>Input: order_id</span>
                    <span>Output: tourLineItems[]</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
                    2
                  </div>
                  <div className="w-0.5 h-12 bg-ui-border-base" />
                </div>
                <div className="flex-1 bg-ui-bg-base rounded-lg p-4 border border-ui-border-base">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">
                      Validate Availability
                    </h3>
                    <Badge color="green" size="small">
                      Completado
                    </Badge>
                  </div>
                  <p className="text-xs text-ui-fg-subtle mb-2">
                    Verifica capacidad disponible para cada tour y fecha
                  </p>
                  <div className="flex gap-4 text-xs text-ui-fg-muted">
                    <span>Duración: 0.5s</span>
                    <span>Validaciones: 3</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
                    3
                  </div>
                  <div className="w-0.5 h-12 bg-ui-border-base" />
                </div>
                <div className="flex-1 bg-ui-bg-base rounded-lg p-4 border border-ui-border-base">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Create Bookings</h3>
                    <Badge color="green" size="small">
                      Completado
                    </Badge>
                  </div>
                  <p className="text-xs text-ui-fg-subtle mb-2">
                    Crea registros de booking para cada pasajero
                  </p>
                  <div className="flex gap-4 text-xs text-ui-fg-muted">
                    <span>Duración: 1.2s</span>
                    <span>Bookings creados: 3</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
                    4
                  </div>
                </div>
                <div className="flex-1 bg-ui-bg-base rounded-lg p-4 border border-ui-border-base">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">
                      Send Notification
                    </h3>
                    <Badge color="green" size="small">
                      Completado
                    </Badge>
                  </div>
                  <p className="text-xs text-ui-fg-subtle mb-2">
                    Envía email de confirmación a los pasajeros
                  </p>
                  <div className="flex gap-4 text-xs text-ui-fg-muted">
                    <span>Duración: 0.3s</span>
                    <span>Emails enviados: 1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-ui-bg-base px-4 py-3 border-t border-ui-border-base">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ui-fg-subtle">Tiempo Total</span>
                <span className="font-semibold">2.3 segundos</span>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Nota:</strong> Esta es una vista previa de cómo se verá
              el detalle de ejecución de workflows cuando la API esté
              disponible. El sistema mostrará input/output de cada step, errores
              detallados, y acciones de compensación en caso de rollback.
            </p>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Detalle de Workflow",
})

export default WorkflowDetailPage
