import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MapPin, EllipsisHorizontal, PencilSquare, Trash, CurrencyDollar } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  DataTablePaginationState,
  Badge,
  toast,
  DropdownMenu,
  IconButton
} from "@medusajs/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk" // Asegúrate de tener configurado tu sdk client
import { Tour } from "../../types"
import { CreateTourModal } from "../../components/create-tour-modal"

// 1. Definimos la interfaz (basada en tu código anterior)


const columnHelper = createDataTableColumnHelper<Tour>()

// 2. Definimos las columnas fuera del componente para mejor rendimiento
const getColumns = (navigate: Function, handleDelete: Function) => [
  columnHelper.accessor("thumbnail", {
    header: "Imagen",
    cell: ({ getValue, row }) => {
      const url = getValue()
      return url ? (
        <img
          src={url}
          alt={row.original.destination}
          className="h-8 w-8 rounded object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-ui-bg-subtle flex items-center justify-center">
          <MapPin className="text-ui-fg-muted" />
        </div>
      )
    },
  }),
  columnHelper.accessor("destination", {
    header: "Destino",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  columnHelper.accessor("duration_days", {
    header: "Duración",
    cell: ({ getValue }) => <span>{getValue()} días</span>,
  }),
  columnHelper.accessor("max_capacity", {
    header: "Capacidad",
    cell: ({ getValue }) => <span>{getValue()} pers.</span>,
  }),
  columnHelper.accessor("available_dates", {
    header: "Fechas",
    cell: ({ getValue }) => {
      const count = getValue()?.length || 0
      return <Badge size="small" color="grey">{count} fechas</Badge>
    },
  }),
  // Columna de Acciones (Action Menu)
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => navigate(`/tours/${row.original.id}`)}
            >
              <PencilSquare className="text-ui-fg-subtle" />
              Editar
            </DropdownMenu.Item>



            <DropdownMenu.Separator />

            <DropdownMenu.Item
              className="gap-x-2 text-ui-fg-error"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash />
              Eliminar
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      )
    },
  }),
]

const ToursListPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Configuración de Paginación
  const limit = 15
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)

  const offset = useMemo(() => {
    return pagination.pageIndex * pagination.pageSize
  }, [pagination])

  // 3. Fetching de datos con useQuery (React Query)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tours", offset, limit], // La key incluye offset para cachear por página
    queryFn: () => sdk.client.fetch("/admin/tours", {
      query: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        order: "-created_at", // Ordenar por más reciente
      }
    }),
  })

  console.log(data)
  // 4. Manejo de la eliminación
  const handleDeleteTour = async (id: string) => {
    // Nota: Para producción, considera usar un componente de Prompt o Dialog para confirmar
    if (!confirm("¿Estás seguro de eliminar este tour?")) return

    try {
      await sdk.client.fetch(`/admin/tours/${id}`, {
        method: "DELETE",
      })

      toast.success("Tour eliminado correctamente")

      // Invalidar la query refresca la tabla automáticamente
      queryClient.invalidateQueries({ queryKey: ["tours"] })
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`)
    }
  }

  // Memorizar columnas para evitar re-renders innecesarios
  const columns = useMemo(() => getColumns(navigate, handleDeleteTour), [navigate])

  // 5. Hook de DataTable
  const table = useDataTable({
    columns,
    data: (data as any)?.tours || [],
    rowCount: (data as any)?.count || 0, // Importante para la paginación del servidor
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  if (isError) {
    return (
      <Container className="p-4 text-ui-fg-error">
        Error cargando tours: {(error as any).message}
      </Container>
    )
  }
  const handleCreateTours = async (data: any) => {
    try {
      await sdk.client.fetch("/admin/tours", {
        method: "POST",
        body: data,
      })
      queryClient.invalidateQueries({ queryKey: ["tours"] })
      handleCloseModal()
    } catch (error: any) {
      toast.error(`Failed to create show: ${error.message}`)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }


  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center px-6 py-4">
          <Heading level="h1">Tours</Heading>
          <Button
            variant="primary"
            size="small"
            onClick={() => setIsModalOpen(true)}
          >
            Crear Tour
          </Button>
        </DataTable.Toolbar>

        {/* Renderiza la tabla o un estado vacío si no hay datos y no está cargando */}
        {!isLoading && (data as any)?.tours?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ui-fg-muted">
            <p className="mb-4">No hay tours creados aún.</p>
            <Button variant="secondary" onClick={() => navigate("/tours/new")}>
              Crear el primer tour
            </Button>
          </div>
        ) : (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>
      <CreateTourModal open={isModalOpen} onOpenChange={handleCloseModal} onSubmit={handleCreateTours} />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Tours",
  icon: MapPin,
})

export default ToursListPage
