import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BoltSolid, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  toast,
  IconButton,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

type NotificationEmailRecipient = {
  id: string
  email: string
}

type NotificationEmailsResponse = {
  emails: NotificationEmailRecipient[]
  count: number
}

const queryKey = ["order-notification-emails"]

const OrderNotificationEmailsPage = () => {
  const [newEmail, setNewEmail] = useState("")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<NotificationEmailsResponse>({
    queryKey,
    queryFn: () => sdk.client.fetch("/admin/order-notification-emails"),
  })

  const createEmailMutation = useMutation({
    mutationFn: (email: string) =>
      sdk.client.fetch("/admin/order-notification-emails", {
        method: "POST",
        body: { email },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setNewEmail("")
      toast.success("Correo agregado")
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo agregar el correo")
    },
  })

  const deleteEmailMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/order-notification-emails/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success("Correo eliminado")
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo eliminar el correo")
    },
  })

  const recipients = useMemo(() => data?.emails ?? [], [data])

  const handleSubmit = () => {
    const normalizedEmail = newEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      toast.error("Ingresa un correo")
      return
    }

    createEmailMutation.mutate(normalizedEmail)
  }

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1">Notificaciones por correo</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Estos correos reciben aviso cada vez que se dispara `order.placed`.
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            Si no hay correos en esta lista, se usa `ORDER_NOTIFICATION_EMAILS` del entorno.
          </Text>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-ui-border-base flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="w-full">
          <Text size="small" weight="plus" className="mb-1 block">
            Correo
          </Text>
          <Input
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="operaciones@empresa.com"
            type="email"
          />
        </div>
        <Button
          size="small"
          onClick={handleSubmit}
          isLoading={createEmailMutation.isPending}
          disabled={createEmailMutation.isPending}
        >
          Agregar
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-fg-interactive border-t-transparent" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="border border-dashed border-ui-border-base rounded-md p-4 text-center">
            <Text className="text-ui-fg-subtle">
              Aun no hay correos configurados para notificaciones.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between border border-ui-border-base rounded-md px-3 py-2"
              >
                <Text size="small" weight="plus">
                  {recipient.email}
                </Text>
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={() => deleteEmailMutation.mutate(recipient.id)}
                  disabled={deleteEmailMutation.isPending}
                >
                  <Trash />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Emails de orden",
  icon: BoltSolid,
})

export default OrderNotificationEmailsPage
