import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BoltSolid } from "@medusajs/icons"
import { Container, Heading, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"

const WorkflowsPage = () => {
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchExecutions()
  }, [])

  const fetchExecutions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/workflows/executions`, {
        credentials: "include",
      })
      const data = await res.json()
      setExecutions(data.executions || [])
      setMessage(data.message || "")
    } catch (error) {
      console.error("Error loading workflow executions:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Monitor de Workflows</Heading>
        </div>
        <div className="px-6 py-4">Cargando...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Monitor de Workflows</Heading>
        <Badge color="orange" size="small">
          Próximamente
        </Badge>
      </div>

      <div className="px-6 py-8">
        {/* Placeholder Content */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-ui-bg-subtle rounded-lg p-8 border border-ui-border-base">
            <div className="flex justify-center mb-4">
              <BoltSolid className="w-16 h-16 text-ui-fg-subtle" />
            </div>
            <h2 className="text-xl font-semibold mb-3">
              Monitoreo de Workflows
            </h2>
            <p className="text-ui-fg-subtle mb-6">{message}</p>

            <div className="bg-ui-bg-base rounded-lg p-6 text-left">
              <h3 className="font-semibold mb-3 text-sm">
                Funcionalidades Planeadas:
              </h3>
              <ul className="space-y-2 text-sm text-ui-fg-subtle">
                <li className="flex items-start gap-2">
                  <span className="text-ui-fg-muted">•</span>
                  <span>
                    Lista de ejecuciones de workflows con filtros por estado
                    (running/completed/failed)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ui-fg-muted">•</span>
                  <span>
                    Visualización detallada de cada step del workflow con
                    input/output
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ui-fg-muted">•</span>
                  <span>
                    Timeline de ejecución mostrando duración de cada paso
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ui-fg-muted">•</span>
                  <span>
                    Indicadores visuales de éxito/error con stack traces
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ui-fg-muted">•</span>
                  <span>
                    Información de compensation actions en caso de rollback
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ui-fg-muted">•</span>
                  <span>
                    Estadísticas de performance y tasas de éxito por workflow
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Workflows Activos:</strong> El sistema utiliza el workflow{" "}
                <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs">
                  create-tour-booking
                </code>{" "}
                para crear reservas de tours a través del endpoint POST /store/tour-bookings.
              </p>
            </div>

            <div className="mt-6 text-xs text-ui-fg-muted">
              <p>
                Esta página se activará cuando Medusa v2 exponga las APIs del
                Workflow Engine Module para consultar ejecuciones.
              </p>
            </div>
          </div>
        </div>

        {/* Mock Preview Section */}
        <div className="mt-8 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Vista Previa de la Interfaz
          </h3>
          <div className="bg-ui-bg-subtle rounded-lg border border-ui-border-base overflow-hidden">
            <div className="bg-ui-bg-base px-4 py-3 border-b border-ui-border-base">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Ejecuciones Recientes
                </span>
                <Badge color="grey" size="small">
                  Demo
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* Mock Execution Item 1 */}
              <div className="flex items-center justify-between p-3 bg-ui-bg-base rounded border border-ui-border-base">
                <div className="flex items-center gap-3">
                  <Badge color="green" size="small">
                    ✓ Completado
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      create-tour-booking
                    </p>
                    <p className="text-xs text-ui-fg-subtle">
                      booking_01234567 • 1 step • 0.8s
                    </p>
                  </div>
                </div>
                <span className="text-xs text-ui-fg-subtle">Hace 5 min</span>
              </div>

              {/* Mock Execution Item 2 */}
              <div className="flex items-center justify-between p-3 bg-ui-bg-base rounded border border-ui-border-base">
                <div className="flex items-center gap-3">
                  <Badge color="orange" size="small">
                    ⏳ En progreso
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      create-tour-booking
                    </p>
                    <p className="text-xs text-ui-fg-subtle">
                      booking_89012345 • En progreso
                    </p>
                  </div>
                </div>
                <span className="text-xs text-ui-fg-subtle">Hace 1 min</span>
              </div>

              {/* Mock Execution Item 3 */}
              <div className="flex items-center justify-between p-3 bg-ui-bg-base rounded border border-ui-border-base">
                <div className="flex items-center gap-3">
                  <Badge color="red" size="small">
                    ✗ Fallido
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      create-tour-booking
                    </p>
                    <p className="text-xs text-ui-fg-subtle">
                      booking_56789012 • Error en validación
                    </p>
                  </div>
                </div>
                <span className="text-xs text-ui-fg-subtle">Hace 15 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Workflows",
  icon: BoltSolid,
})

export default WorkflowsPage
