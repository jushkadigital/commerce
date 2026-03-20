import {
  Button,
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
import React, { Fragment } from "react"

type Passenger = {
  name?: string
  type?: string
  passport?: string
}

type PassengerCounts = {
  adults?: number | null
  children?: number | null
  infants?: number | null
}

type PassengerCountTotals = {
  adults: number
  children: number
  infants: number
}

type CartItemMetadata = {
  group_id?: string | null
  passengers?: Passenger[] | PassengerCounts | null
}

type CartItem = {
  groupId?: string | null
  metadata?: CartItemMetadata | null
  name?: string | null
  date?: string | Date | null
  quantity?: number | null
  total?: number | null
  imageUrl?: string | null
  passengers?: Passenger[] | PassengerCounts | null
}

type NormalizedCartItem = {
  groupKey: string
  groupLabel: string
  name: string
  date: string | Date | null
  quantity: number
  total: number
  imageUrl?: string | null
  passengerCounts: PassengerCountTotals
}

type GroupedCartItems = {
  groupKey: string
  groupLabel: string
  items: NormalizedCartItem[]
  totalQuantity: number
  totalAmount: number
  passengerCounts: PassengerCountTotals
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
}

function sanitizeBaseUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  return trimmed.replace(/\/+$/, "")
}

function buildOrderDetailsUrl(baseUrl: string | null, orderId: string, bookingId: string): string | null {
  if (!baseUrl) {
    return null
  }

  const normalizedOrderId = orderId.trim()
  const normalizedBookingId = bookingId.trim()
  const reservationId = normalizedOrderId.length > 0 ? normalizedOrderId : normalizedBookingId

  if (reservationId.length === 0) {
    return null
  }

  const hasPeSuffix = /\/pe$/i.test(baseUrl)
  const orderPath = hasPeSuffix
    ? `/account/orders/details/${encodeURIComponent(reservationId)}`
    : `/pe/account/orders/details/${encodeURIComponent(reservationId)}`

  return `${baseUrl}${orderPath}`
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

function createPassengerCounts(): PassengerCountTotals {
  return {
    adults: 0,
    children: 0,
    infants: 0,
  }
}

function isPassengerCounts(
  value: Passenger[] | PassengerCounts | null | undefined
): value is PassengerCounts {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizePassengerType(value: string | null | undefined): keyof PassengerCountTotals | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === "adult" || normalized === "adults") {
    return "adults"
  }

  if (normalized === "child" || normalized === "children") {
    return "children"
  }

  if (normalized === "infant" || normalized === "infants") {
    return "infants"
  }

  return null
}

function normalizePassengerCounts(
  value: Passenger[] | PassengerCounts | null | undefined
): PassengerCountTotals {
  const counts = createPassengerCounts()

  if (Array.isArray(value)) {
    for (const passenger of value) {
      const passengerType = normalizePassengerType(passenger?.type)
      if (passengerType) {
        counts[passengerType] += 1
      }
    }

    return counts
  }

  if (isPassengerCounts(value)) {
    counts.adults = normalizeQuantity(value.adults ?? null)
    counts.children = normalizeQuantity(value.children ?? null)
    counts.infants = normalizeQuantity(value.infants ?? null)
  }

  return counts
}

function sumPassengerCounts(
  left: PassengerCountTotals,
  right: PassengerCountTotals
): PassengerCountTotals {
  return {
    adults: left.adults + right.adults,
    children: left.children + right.children,
    infants: left.infants + right.infants,
  }
}

function getPassengerCountTotal(counts: PassengerCountTotals): number {
  return counts.adults + counts.children + counts.infants
}

function formatPassengerSummary(counts: PassengerCountTotals): string | null {
  const parts: string[] = []

  if (counts.adults > 0) {
    parts.push(`${counts.adults} ${counts.adults === 1 ? "adulto" : "adultos"}`)
  }

  if (counts.children > 0) {
    parts.push(`${counts.children} ${counts.children === 1 ? "niño" : "niños"}`)
  }

  if (counts.infants > 0) {
    parts.push(`${counts.infants} ${counts.infants === 1 ? "infante" : "infantes"}`)
  }

  return parts.length > 0 ? parts.join(" ") : null
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
    const group = normalizeGroup(item.metadata?.group_id ?? item.groupId, index)
    const passengerCounts = normalizePassengerCounts(item.passengers ?? item.metadata?.passengers)
    const passengerTotal = getPassengerCountTotal(passengerCounts)
    const quantity = normalizeQuantity(item.quantity)

    return {
      groupKey: group.groupKey,
      groupLabel: group.groupLabel,
      name: typeof item.name === "string" && item.name.trim().length > 0
        ? item.name.trim()
        : "Experiencia Pata Rutera",
      date: item.date ?? null,
      quantity: passengerTotal > 0 ? passengerTotal : quantity,
      total: normalizeTotal(item.total),
      imageUrl:
        typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0
          ? item.imageUrl
          : null,
      passengerCounts,
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
      existingGroup.passengerCounts = sumPassengerCounts(
        existingGroup.passengerCounts,
        item.passengerCounts
      )
      continue
    }

    groupedMap.set(item.groupKey, {
      groupKey: item.groupKey,
      groupLabel: item.groupLabel,
      items: [item],
      totalQuantity: item.quantity,
      totalAmount: item.total,
      passengerCounts: item.passengerCounts,
    })
  }

  return Array.from(groupedMap.values())
}

export function TravelBookingNotificationEmail(
  props: TravelBookingNotificationEmailProps
) {
  const frontstoreUrl = sanitizeBaseUrl(process.env.FRONTSTORE_URL ?? process.env.STORE_URL)
  const reservationDetailsUrl = buildOrderDetailsUrl(frontstoreUrl, props.orderId, props.bookingId)
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
    passengers,
  }
  const normalizedCartItems = normalizeCartItems(props.cartItems, fallbackCartItem)
  const groupedCartItems = groupCartItemsById(normalizedCartItems)
  const orderPassengerCounts = groupedCartItems.reduce(
    (counts, group) => sumPassengerCounts(counts, group.passengerCounts),
    createPassengerCounts()
  )
  const fallbackPassengerCounts = normalizePassengerCounts(passengers)
  const effectivePassengerCounts =
    getPassengerCountTotal(orderPassengerCounts) > 0 ? orderPassengerCounts : fallbackPassengerCounts
  const passengerSummary = formatPassengerSummary(effectivePassengerCounts)

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
            Gracias por realizar tu compra con Pata Rutera. Estamos felices de que hayas decidido unirte a esta aventura con nosotros. Nuestro equipo ya está preparando todo para que vivas una experiencia inolvidable
          </Text>

          <Heading style={subheading}>Nos vemos muy pronto Ruter@ </Heading>

          <Section style={orderSection}>
            <Text style={orderTitle}>Detalles de la Reserva</Text>
            <Text style={typeBadge}>{`Tipo de reserva: ${reservationTypeLabel}`}</Text>
            <Text style={typeBadge}>{`Id compra: ${props.orderId}`}</Text>
            {passengerSummary && (
              <Text style={groupSummaryText}>{`Pasajeros: ${passengerSummary}`}</Text>
            )}

            <table style={table}>
              <thead>
                <tr>
                  <th style={tableHeader}>Servicio</th>
                  <th style={tableHeader}></th>
                  <th style={tableHeader}>Fecha</th>
                  <th style={tableHeader}>Viajeros</th>
                  <th style={tableHeader}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {groupedCartItems.map((group) => (
                  <Fragment key={group.groupKey}>
                    {group.items.map((item, index) => (
                      <tr style={tableRow} key={`${group.groupKey}-${index}`}>
                        <td style={tableCell}>
                          <Img src={item.imageUrl || imageSrc} alt="reserva" style={itemImage} />
                        </td>
                        <td style={tableCell}>
                          <Text style={itemName}>{item.name}</Text>
                          {formatPassengerSummary(item.passengerCounts) && (
                            <Text style={itemMeta}>
                              {formatPassengerSummary(item.passengerCounts)}
                            </Text>
                          )}
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

          {reservationDetailsUrl && (
            <Section style={ctaSection}>
              <Button href={reservationDetailsUrl} style={viewReservationButton}>
                Ver reserva
              </Button>
            </Section>
          )}

          {passengers.length > 0 && (
            <Section style={orderSection}>
              <Text style={orderTitle}>Pasajeros</Text>
              {passengerSummary && (
                <Text style={groupSummaryText}>{`Resumen: ${passengerSummary}`}</Text>
              )}
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

const groupSummaryText = {
  color: "#4a5568",
  fontSize: "12px",
  fontWeight: "600",
  margin: "0 0 12px",
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

const ctaSection = {
  margin: "24px 0 8px",
  textAlign: "center" as const,
}

const viewReservationButton = {
  backgroundColor: "#2b6cb0",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "12px 22px",
  textDecoration: "none",
}

const footer = {
  color: "#a0aec0",
  fontSize: "12px",
  margin: "30px 0 0",
  textAlign: "center" as const,
}

export default TravelBookingNotificationEmail
