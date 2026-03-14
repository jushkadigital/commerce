import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import { Fragment } from "react"

type Passenger = {
  name?: string
  type?: string
  passport?: string
}

type CartItem = {
  groupId?: string | null
  name?: string | null
  date?: string | Date | null
  quantity?: number | null
  total?: number | null
  imageUrl?: string | null
}

type NormalizedCartItem = {
  groupKey: string
  groupLabel: string
  name: string
  date: string | Date | null
  quantity: number
  total: number
  imageUrl?: string | null
}

type GroupedCartItems = {
  groupKey: string
  groupLabel: string
  items: NormalizedCartItem[]
  totalQuantity: number
  totalAmount: number
}

export type TravelBookingNotificationEmailProps = {
  reservationType: "Tour" | "Package" | "Mixed"
  orderId: string
  bookingId: string
  recipientName?: string | null
  destination?: string | null
  travelDate?: string | Date | null
  price?: number | null
  currencyCode?: string | null
  passengers?: Passenger[]
  cartItems?: CartItem[]
  imageUrl?: string | null
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "N/A"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)
}

function formatPrice(amount: number | null | undefined, currencyCode?: string | null): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "N/A"
  }

  const normalizedCurrency =
    typeof currencyCode === "string" ? currencyCode.trim().toUpperCase() : ""
  const currency = /^[A-Z]{3}$/.test(normalizedCurrency)
    ? normalizedCurrency
    : "USD"

  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function normalizeQuantity(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return 0
  }

  return Math.floor(value)
}

function normalizeTotal(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0
  }

  return value
}

function normalizeGroup(
  value: string | null | undefined,
  index: number
): { groupKey: string; groupLabel: string } {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return {
        groupKey: trimmed,
        groupLabel: trimmed,
      }
    }
  }

  return {
    groupKey: `SIN-GRUPO-${index + 1}`,
    groupLabel: "SIN-GRUPO",
  }
}

function normalizeCartItems(items: CartItem[] | undefined, fallback: CartItem): NormalizedCartItem[] {
  const sourceItems = Array.isArray(items) && items.length > 0 ? items : [fallback]

  return sourceItems.map((item, index) => {
    const group = normalizeGroup(item.groupId, index)

    return {
      groupKey: group.groupKey,
      groupLabel: group.groupLabel,
      name: typeof item.name === "string" && item.name.trim().length > 0
        ? item.name.trim()
        : "Experiencia Pata Rutera",
      date: item.date ?? null,
      quantity: normalizeQuantity(item.quantity),
      total: normalizeTotal(item.total),
      imageUrl:
        typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0
          ? item.imageUrl
          : null,
    }
  })
}

function groupCartItemsById(items: NormalizedCartItem[]): GroupedCartItems[] {
  const groupedMap = new Map<string, GroupedCartItems>()

  for (const item of items) {
    const existingGroup = groupedMap.get(item.groupKey)
    if (existingGroup) {
      existingGroup.items.push(item)
      existingGroup.totalQuantity += item.quantity
      existingGroup.totalAmount += item.total
      continue
    }

    groupedMap.set(item.groupKey, {
      groupKey: item.groupKey,
      groupLabel: item.groupLabel,
      items: [item],
      totalQuantity: item.quantity,
      totalAmount: item.total,
    })
  }

  return Array.from(groupedMap.values())
}

export function TravelBookingNotificationEmail(
  props: TravelBookingNotificationEmailProps
) {
  const reservationType =
    props.reservationType === "Package" ||
    props.reservationType === "Tour" ||
    props.reservationType === "Mixed"
      ? props.reservationType
      : "Tour"
  const reservationTypeLabel = reservationType === "Mixed" ? "Mixta" : reservationType
  const passengers = Array.isArray(props.passengers) ? props.passengers : []
  const derivedPassengerName =
    passengers.find((passenger) => typeof passenger?.name === "string" && passenger.name.trim())
      ?.name || "viajero"
  const customerName =
    typeof props.recipientName === "string" && props.recipientName.trim().length > 0
      ? props.recipientName.trim()
      : derivedPassengerName
  const travelers = passengers.length > 0 ? passengers.length : 1
  const imageSrc =
    typeof props.imageUrl === "string" && props.imageUrl.length > 0
      ? props.imageUrl
      : "https://www.patarutera.pe/pataLogo.png"
  const fallbackCartItem: CartItem = {
    groupId: "SIN-GRUPO",
    name: props.destination || "Experiencia Pata Rutera",
    date: props.travelDate,
    quantity: travelers,
    total: props.price,
    imageUrl: imageSrc,
  }
  const normalizedCartItems = normalizeCartItems(props.cartItems, fallbackCartItem)
  const groupedCartItems = groupCartItemsById(normalizedCartItems)

  return (
    <Html>
      <Head />
      <Preview>{`Tu reserva de ${reservationTypeLabel} fue confirmada - PATA RUTERA`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src="https://www.patarutera.pe/pataLogo.png" alt="Pata Rutera" style={logo} />
          </Section>

          <Heading style={heading}>{`TU RESERVA DE ${reservationTypeLabel.toUpperCase()} FUE CONFIRMADA`}</Heading>

          <Text style={description}>
            Hola {customerName}, gracias por realizar tu compra con nosotros. Estamos preparando todo
            para que vivas una experiencia inolvidable.
          </Text>

          <Heading style={subheading}>Nos vemos muy pronto, {customerName}</Heading>

          <Section style={orderSection}>
            <Text style={orderTitle}>Detalles de la Reserva</Text>
            <Text style={typeBadge}>{`Tipo de reserva: ${reservationTypeLabel}`}</Text>

            <table style={table}>
              <thead>
                <tr>
                  <th style={tableHeader}>Imagen</th>
                  <th style={tableHeader}>Nombre</th>
                  <th style={tableHeader}>Fecha</th>
                  <th style={tableHeader}>Cantidad</th>
                  <th style={tableHeader}>Total</th>
                </tr>
              </thead>
              <tbody>
                {groupedCartItems.map((group) => (
                  <Fragment key={group.groupKey}>
                    <tr style={groupHeaderRow}>
                      <td style={groupHeaderCell} colSpan={5}>
                        <Text style={groupHeaderText}>Grupo: {group.groupLabel}</Text>
                      </td>
                    </tr>

                    {group.items.map((item, index) => (
                      <tr style={tableRow} key={`${group.groupKey}-${index}`}>
                        <td style={tableCell}>
                          <Img src={item.imageUrl || imageSrc} alt="reserva" style={itemImage} />
                        </td>
                        <td style={tableCell}>
                          <Text style={itemName}>{item.name}</Text>
                          <Text style={itemMeta}>Pedido: {props.orderId}</Text>
                        </td>
                        <td style={tableCell}>
                          <Text style={itemDate}>{formatDate(item.date)}</Text>
                        </td>
                        <td style={tableCellCenter}>
                          <Text style={itemTravelers}>{item.quantity}</Text>
                        </td>
                        <td style={tableCellRight}>
                          <Text style={itemPrice}>
                            {formatPrice(item.total, props.currencyCode)}
                          </Text>
                        </td>
                      </tr>
                    ))}

                    <tr style={groupTotalsRow}>
                      <td style={groupTotalsLabelCell} colSpan={3}>
                        <Text style={groupTotalsLabel}>Totales del grupo</Text>
                      </td>
                      <td style={tableCellCenter}>
                        <Text style={groupTotalsValue}>{group.totalQuantity}</Text>
                      </td>
                      <td style={tableCellRight}>
                        <Text style={groupTotalsAmount}>
                          {formatPrice(group.totalAmount, props.currencyCode)}
                        </Text>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Section>

          {passengers.length > 0 && (
            <Section style={orderSection}>
              <Text style={orderTitle}>Pasajeros</Text>
              {passengers.map((passenger, index) => (
                <Text key={`${passenger.name || "passenger"}-${index}`} style={passengerLine}>
                  {`${index + 1}. ${passenger.name || "Sin nombre"} (${passenger.type || "N/A"})${passenger.passport ? ` - Passport: ${passenger.passport}` : ""}`}
                </Text>
              ))}
            </Section>
          )}

          <Text style={footer}>Agradecemos tu confianza</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  padding: "40px 20px",
}

const logoSection = {
  marginBottom: "30px",
  textAlign: "center" as const,
}

const logo = {
  height: "50px",
  margin: "0 auto",
}

const heading = {
  color: "#4a5568",
  fontSize: "20px",
  fontWeight: "700",
  letterSpacing: "0.5px",
  margin: "30px 0 20px",
  textAlign: "center" as const,
}

const description = {
  color: "#718096",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 30px",
  padding: "0 20px",
  textAlign: "center" as const,
}

const subheading = {
  color: "#4a5568",
  fontSize: "18px",
  fontWeight: "600",
  margin: "30px 0 20px",
  textAlign: "center" as const,
}

const orderSection = {
  backgroundColor: "#f7fafc",
  borderRadius: "8px",
  margin: "20px 0",
  padding: "20px",
}

const orderTitle = {
  color: "#4a5568",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 15px",
}

const typeBadge = {
  backgroundColor: "#ebf8ff",
  borderRadius: "999px",
  color: "#2b6cb0",
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "700",
  margin: "0 0 12px",
  padding: "4px 10px",
}

const table = {
  borderCollapse: "collapse" as const,
  width: "100%",
}

const tableHeader = {
  backgroundColor: "#e2e8f0",
  borderBottom: "2px solid #cbd5e0",
  color: "#4a5568",
  fontSize: "12px",
  fontWeight: "600",
  padding: "10px",
  textAlign: "left" as const,
}

const tableRow = {
  borderBottom: "1px solid #e2e8f0",
}

const groupHeaderRow = {
  backgroundColor: "#edf2f7",
}

const groupHeaderCell = {
  borderBottom: "1px solid #cbd5e0",
  padding: "8px 10px",
}

const groupHeaderText = {
  color: "#2d3748",
  fontSize: "12px",
  fontWeight: "700",
  margin: "0",
}

const tableCell = {
  padding: "12px 10px",
  verticalAlign: "middle" as const,
}

const tableCellCenter = {
  padding: "12px 10px",
  textAlign: "center" as const,
  verticalAlign: "middle" as const,
}

const tableCellRight = {
  padding: "12px 10px",
  textAlign: "right" as const,
  verticalAlign: "middle" as const,
}

const itemImage = {
  borderRadius: "8px",
  height: "60px",
  width: "60px",
}

const itemName = {
  color: "#2d3748",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
}

const itemMeta = {
  color: "#718096",
  fontSize: "11px",
  margin: "2px 0 0",
}

const itemDate = {
  color: "#718096",
  fontSize: "12px",
  margin: "0",
}

const itemTravelers = {
  color: "#2d3748",
  fontSize: "14px",
  margin: "0",
}

const itemPrice = {
  color: "#3182ce",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0",
}

const groupTotalsRow = {
  backgroundColor: "#f8fafc",
  borderBottom: "2px solid #cbd5e0",
}

const groupTotalsLabelCell = {
  padding: "10px",
}

const groupTotalsLabel = {
  color: "#4a5568",
  fontSize: "12px",
  fontWeight: "700",
  margin: "0",
}

const groupTotalsValue = {
  color: "#2d3748",
  fontSize: "13px",
  fontWeight: "700",
  margin: "0",
}

const groupTotalsAmount = {
  color: "#2b6cb0",
  fontSize: "14px",
  fontWeight: "700",
  margin: "0",
}

const passengerLine = {
  color: "#4a5568",
  fontSize: "13px",
  margin: "0 0 6px",
}

const footer = {
  color: "#a0aec0",
  fontSize: "12px",
  margin: "30px 0 0",
  textAlign: "center" as const,
}

export default TravelBookingNotificationEmail
