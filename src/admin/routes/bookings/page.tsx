import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar, EllipsisHorizontal, PencilSquare } from "@medusajs/icons"
import {
  Container,
  Heading,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  DataTablePaginationState,
  Badge,
  DropdownMenu,
  IconButton,
  Text
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"
import { Booking } from "../../types"

function groupBy<T>(array: T[], getKey: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = getKey(item)
    ;(acc[key] ||= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

const columnHelper = createDataTableColumnHelper<Booking>()

const getColumns = (handlerModal: Function) => [
  columnHelper.accessor("bookingType", {
    header: "Tipo",
    cell: ({ getValue }) => {
      const type = getValue()
      return (
        <Badge color={type === "tour" ? "blue" : "orange"} className="capitalize">
          {type === "tour" ? "Tour" : "Package"}
        </Badge>
      )
    },
  }),
  columnHelper.accessor("type", {
    header: "Pedido",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  columnHelper.accessor("fecha", {
    header: "Fecha",
    cell: ({ getValue }) => <span>{new Date(getValue() as string).toLocaleDateString()}</span>,
  }),
  columnHelper.display({
    id: "destination",
    cell: ({ row }) => {
      const destination = (row.original as any).items?.[0]?.[row.original.bookingType === "tour" ? "tour" : "package"]?.destination
      return destination ? (
        <Text className="text-ui-fg-base">{destination}</Text>
      ) : <Text className="text-ui-fg-muted">-</Text>
    }
  }),
  columnHelper.display({
    id: "passengers",
    cell: ({ row }) => {
      const items = (row.original as any).items
      return items ? (
        <Text className="text-ui-fg-subtle text-small">{items.length} pasajeros</Text>
      ) : <Text className="text-ui-fg-muted">-</Text>
    }
  }),
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
              Ver Detalles
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      )
    },
  }),
]


const BookingListPage = () => {
  const limit = 15
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<null | Booking>(null)

  const handlerModal = (booking: Booking) => {
    console.log(booking)
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  const offset = useMemo(() => {
    return pagination.pageIndex * pagination.pageSize
  }, [pagination])

  const { data: tourData, isLoading: tourLoading } = useQuery({
    queryKey: ["tour-booking", offset, limit],
    queryFn: () => sdk.client.fetch("/admin/bookings", {
      query: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        type: "tour",
      }
    }),
  })

  const { data: packageData, isLoading: packageLoading } = useQuery({
    queryKey: ["package-booking", offset, limit],
    queryFn: () => sdk.client.fetch("/admin/bookings", {
      query: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        type: "package",
      }
    }),
  })

  const isLoading = tourLoading || packageLoading

  const tourBookings = Object.entries(
    groupBy(
      (tourData as any)?.tours_booking ?? [],
      (b: any) => b.order_id
    )
  ).map(([type, items]) => ({
    type,
    items,
    fecha: (items as any)[0].tour_date,
    bookingType: "tour" as const
  }))

  const packageBookings = Object.entries(
    groupBy(
      (packageData as any)?.packages_booking ?? [],
      (b: any) => b.order_id
    )
  ).map(([type, items]) => ({
    type,
    items,
    fecha: (items as any)[0].package_date,
    bookingType: "package" as const
  }))

  const bookings = [...tourBookings, ...packageBookings]
    .sort((a, b) => new Date(b.fecha as string).getTime() - new Date(a.fecha as string).getTime())

  const columns = useMemo(() => getColumns(handlerModal), [])

  const table = useDataTable({
    columns,
    data: bookings,
    rowCount: bookings.length || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBooking(null)
  }

  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center px-6 py-4">
          <Heading level="h1">Reservas</Heading>
        </DataTable.Toolbar>

        {!isLoading && bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ui-fg-muted">
            <p className="mb-4">No hay reservas creadas aún.</p>
          </div>
        ) : (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">
                {selectedBooking.bookingType === "tour" ? "Tour" : "Package"} - Reserva
              </h2>
              <button onClick={handleCloseModal} className="text-ui-fg-muted hover:text-ui-fg-base">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Text className="text-ui-fg-subtle text-small font-medium">Pedido</Text>
                <Text className="text-ui-fg-base">{selectedBooking.type}</Text>
              </div>

              <div>
                <Text className="text-ui-fg-subtle text-small font-medium">Fecha</Text>
                <Text className="text-ui-fg-base">
                  {new Date(selectedBooking.fecha as string).toLocaleDateString()}
                </Text>
              </div>

              {selectedBooking.items && selectedBooking.items.length > 0 && (
                <div>
                  <Text className="text-ui-fg-subtle text-small font-medium mb-2 block">Detalles</Text>
                  <div className="space-y-2">
                    {selectedBooking.items.map((item: any, index: number) => {
                      const data = item.tour || item.package
                      return (
                        <div key={index} className="p-3 bg-ui-bg-subtle rounded">
                          <div className="font-medium">{data?.destination}</div>
                          <div className="text-small text-ui-fg-subtle">
                            Duración: {data?.duration_days} días
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reservas",
  icon: Calendar,
})

export default BookingListPage
