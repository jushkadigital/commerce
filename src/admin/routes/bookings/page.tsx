import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MapPin, Calendar, EllipsisHorizontal, PencilSquare, Trash, CurrencyDollar } from "@medusajs/icons"
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
import { Booking } from "../../types"
import { TourFormModal } from "../../components/create-tour-modal"

// 1. Definimos la interfaz (basada en tu código anterior)

function groupBy<T, K extends PropertyKey>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return array.reduce((acc, item) => {
    const key = getKey(item)
      ; (acc[key] ||= []).push(item)
    return acc
  }, {} as Record<K, T[]>)
}
const columnHelper = createDataTableColumnHelper<Booking>()

// 2. Definimos las columnas fuera del componente para mejor rendimiento
const getColumns = (navigate: Function, handlerModal: Function) => [
  columnHelper.accessor("type", {
    header: "pedido",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  columnHelper.accessor("fecha", {
    header: "Fecha",
    cell: ({ getValue }) => <span>{getValue()} días</span>,
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
              onClick={() => handlerModal(row.original)}
            >
              <PencilSquare className="text-ui-fg-subtle" />
              Info
            </DropdownMenu.Item>




            {/**<DropdownMenu.Item
              className="gap-x-2 text-ui-fg-error"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash />
              Eliminar
            </DropdownMenu.Item>**/}
          </DropdownMenu.Content>
        </DropdownMenu>
      )
    },
  }),
]


const BookingListPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Configuración de Paginación
  const limit = 15
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [getBooking, setGetBooking] = useState<null | Booking>(null)


  const handlerModal = (booking: Booking) => {
    console.log(booking)
    setGetBooking(booking)
    setIsModalOpen(true)
  }




  const offset = useMemo(() => {
    return pagination.pageIndex * pagination.pageSize
  }, [pagination])

  // 3. Fetching de datos con useQuery (React Query)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["booking", offset, limit], // La key incluye offset para cachear por página
    queryFn: () => sdk.client.fetch("/admin/bookings", {
      query: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
      }
    }),
  })

  console.log(data)
  // 4. Manejo de la eliminación
  // Memorizar columnas para evitar re-renders innecesarios
  const columns = useMemo(() => getColumns(navigate, handlerModal), [isModalOpen, setIsModalOpen])



  const bookings = Object.entries(
    groupBy(
      (data as any)?.tours_booking ?? [],
      b => b.order_id
    )
  ).map(([type, items]) => ({
    type,
    items,
    fecha: items[0].tour_date
  }))
  console.log(bookings)

  // 5. Hook de DataTable
  const table = useDataTable({
    columns,
    data: bookings,
    rowCount: bookings.length || 0, // Importante para la paginación del servidor
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


  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center px-6 py-4">
          <Heading level="h1">Reservas</Heading>
          {/**<Button
            variant="primary"
            size="small"
            onClick={() => handlerCreateModal()}
          >
            Crear Tour
          </Button>**/}
        </DataTable.Toolbar>

        {/* Renderiza la tabla o un estado vacío si no hay datos y no está cargando */}
        {!isLoading && (data as any)?.bookings?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ui-fg-muted">
            <p className="mb-4">No hay reservas creados aún.</p>
          </div>
        ) : (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reservas",
  icon: Calendar,
})

export default BookingListPage
