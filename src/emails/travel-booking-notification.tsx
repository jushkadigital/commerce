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

type Passenger = {
  name?: string
  type?: string
  passport?: string
}

export type TravelBookingNotificationEmailProps = {
  reservationType: "Tour" | "Package"
  orderId: string
  bookingId: string
  recipientName?: string | null
  destination?: string | null
  travelDate?: string | Date | null
  price?: number | null
  currencyCode?: string | null
  preData?: unknown
  passengers?: Passenger[]
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

function stringifyPreData(preData: unknown): string {
  if (preData === null || preData === undefined) {
    return "N/A"
  }

  if (typeof preData === "string") {
    try {
      return JSON.stringify(JSON.parse(preData), null, 2)
    } catch {
      return preData
    }
  }

  try {
    return JSON.stringify(preData, null, 2)
  } catch {
    return String(preData)
  }
}

export function TravelBookingNotificationEmail(
  props: TravelBookingNotificationEmailProps
) {
  const reservationType =
    props.reservationType === "Package" || props.reservationType === "Tour"
      ? props.reservationType
      : "Tour"
  const reservationTypeLabel = reservationType
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
                  <th style={tableHeader}>Viajeros</th>
                  <th style={tableHeader}>Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr style={tableRow}>
                  <td style={tableCell}>
                    <Img src={imageSrc} alt="reserva" style={itemImage} />
                  </td>
                  <td style={tableCell}>
                    <Text style={itemName}>{props.destination || "Experiencia Pata Rutera"}</Text>
                    <Text style={itemMeta}>Booking: {props.bookingId}</Text>
                    <Text style={itemMeta}>Pedido: {props.orderId}</Text>
                  </td>
                  <td style={tableCell}>
                    <Text style={itemDate}>{formatDate(props.travelDate)}</Text>
                  </td>
                  <td style={tableCellCenter}>
                    <Text style={itemTravelers}>{travelers}</Text>
                  </td>
                  <td style={tableCellRight}>
                    <Text style={itemPrice}>{formatPrice(props.price, props.currencyCode)}</Text>
                  </td>
                </tr>
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

          <Section style={orderSection}>
            <Text style={orderTitle}>preData (JSON)</Text>
            <pre style={preDataBox}>{stringifyPreData(props.preData)}</pre>
          </Section>

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

const passengerLine = {
  color: "#4a5568",
  fontSize: "13px",
  margin: "0 0 6px",
}

const preDataBox = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  color: "#e2e8f0",
  fontSize: "12px",
  margin: "0",
  maxHeight: "300px",
  overflow: "auto",
  padding: "10px",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
}

const footer = {
  color: "#a0aec0",
  fontSize: "12px",
  margin: "30px 0 0",
  textAlign: "center" as const,
}

export default TravelBookingNotificationEmail
