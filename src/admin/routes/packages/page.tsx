import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MapPin, EllipsisHorizontal, PencilSquare, Trash } from "@medusajs/icons"
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
import { sdk } from "../../lib/sdk"
import { Package } from "../../types"
import { PackageFormModal } from "../../components/create-package-modal"

const columnHelper = createDataTableColumnHelper<Package>()

const getColumns = (navigate: Function, handleDelete: Function, handlerUpdate: Function) => [
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
              onClick={() => handlerUpdate(row.original)}
            >
              <PencilSquare className="text-ui-fg-subtle" />
              Editar
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      )
    },
  }),
]


const PackagesListPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const limit = 15
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [getPackage, setGetPackage] = useState<null | Package>(null)


  const handlerUpdateModal = (pkg: Package) => {
    setGetPackage(pkg)
    setIsModalOpen(true)
  }
  const handlerCreateModal = () => {
    setGetPackage(null)
    setIsModalOpen(true)
  }



  const offset = useMemo(() => {
    return pagination.pageIndex * pagination.pageSize
  }, [pagination])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["package", offset, limit],
    queryFn: () => sdk.client.fetch("/admin/packages", {
      query: {
        offset: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        order: "-created_at",
      }
    }),
  })

  const handleDeletePackage = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este package?")) return

    try {
      await sdk.client.fetch(`/admin/packages/${id}`, {
        method: "DELETE",
      })

      toast.success("Package eliminado correctamente")
      queryClient.invalidateQueries({ queryKey: ["packages"] })
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`)
    }
  }

  const columns = useMemo(() => getColumns(navigate, handleDeletePackage, handlerUpdateModal), [isModalOpen, setIsModalOpen])

  const table = useDataTable({
    columns,
    data: (data as any)?.packages || [],
    rowCount: (data as any)?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  if (isError) {
    return (
      <Container className="p-4 text-ui-fg-error">
        Error cargando packages: {(error as any).message}
      </Container>
    )
  }
  const handleCreatePackages = async (data: any) => {
    try {
      await sdk.client.fetch("/admin/packages", {
        method: "POST",
        body: data,
      })
      queryClient.invalidateQueries({ queryKey: ["package"] })
      handleCloseModal()
    } catch (error: any) {
      toast.error(`Failed to create package: ${error.message}`)
    }
  }

  const handleUpdatePackages = async (data: any) => {
    try {
      await sdk.client.fetch(`/admin/packages/${data.id}`, {
        method: "POST",
        body: data,
      })
      queryClient.invalidateQueries({ queryKey: ["package"] })
      handleCloseModal()
    } catch (error: any) {
      toast.error(`Failed to update package: ${error.message}`)
    }
  }
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }


  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center px-6 py-4">
          <Heading level="h1">Packages</Heading>
        </DataTable.Toolbar>

        {!isLoading && (data as any)?.packages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ui-fg-muted">
            <p className="mb-4">No hay packages creados aún.</p>
            <Button variant="secondary" onClick={() => navigate("/packages/new")}>
              Crear el primer package
            </Button>
          </div>
        ) : (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>
      <PackageFormModal open={isModalOpen} onOpenChange={handleCloseModal} onSubmit={handleCreatePackages} onUpdated={handleUpdatePackages} packageToEdit={getPackage && getPackage} />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Packages",
  icon: MapPin,
})

export default PackagesListPage
