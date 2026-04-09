import crypto from "crypto"

type HeaderValue = string | string[] | undefined

type RequestLike = {
  headers?: Record<string, HeaderValue>
  query?: Record<string, unknown>
  originalUrl?: string
  url?: string
}

type LoggerLike = {
  info?: (...args: unknown[]) => void
  warn?: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
}

export type CommerceEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"

export type TrackingItem = {
  contentId: string
  contentType?: string
  contentName?: string
  contentCategory?: string
  quantity?: number
  price?: number
}

type TrackingUser = {
  email?: string
  phone?: string
  externalId?: string
  firstName?: string
  lastName?: string
  fbp?: string
  fbc?: string
  ttp?: string
  ttclid?: string
  clientIpAddress?: string
  clientUserAgent?: string
}

export type TrackCommerceEventInput = {
  eventName: CommerceEventName
  eventId: string
  items: TrackingItem[]
  request?: RequestLike
  sourceUrl?: string
  currency?: string
  value?: number
  orderId?: string
  description?: string
  user?: TrackingUser
  logger?: LoggerLike
}

const META_API_VERSION = process.env.META_CONVERSIONS_API_VERSION || "v21.0"
const META_PIXEL_ID = process.env.META_PIXEL_ID || process.env.FACEBOOK_PIXEL_ID
const META_ACCESS_TOKEN =
  process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN
const TIKTOK_PIXEL_CODE = process.env.TIKTOK_PIXEL_CODE
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN
const REQUEST_TIMEOUT_MS = 8000

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeLowercase(value: unknown): string | undefined {
  return normalizeString(value)?.toLowerCase()
}

function normalizeDigits(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.replace(/[^\d+]/g, "")
  return normalized && normalized.length > 0 ? normalized : undefined
}

function sha256(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  return crypto.createHash("sha256").update(value).digest("hex")
}

function getHeader(request: RequestLike | undefined, headerName: string): string | undefined {
  if (!request?.headers) {
    return undefined
  }

  const direct = request.headers[headerName] ?? request.headers[headerName.toLowerCase()]

  if (Array.isArray(direct)) {
    return normalizeString(direct[0])
  }

  return normalizeString(direct)
}

function getQueryValue(request: RequestLike | undefined, key: string): string | undefined {
  const value = request?.query?.[key]

  if (Array.isArray(value)) {
    return normalizeString(value[0])
  }

  return normalizeString(value)
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>()

  if (!cookieHeader) {
    return cookies
  }

  for (const chunk of cookieHeader.split(";")) {
    const separatorIndex = chunk.indexOf("=")

    if (separatorIndex === -1) {
      continue
    }

    const key = chunk.slice(0, separatorIndex).trim()
    const value = chunk.slice(separatorIndex + 1).trim()

    if (key.length === 0 || value.length === 0) {
      continue
    }

    cookies.set(key, value)
  }

  return cookies
}

function extractClientIpAddress(request: RequestLike | undefined): string | undefined {
  const forwardedFor = getHeader(request, "x-forwarded-for")

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  return (
    getHeader(request, "x-real-ip") ||
    getHeader(request, "cf-connecting-ip") ||
    getHeader(request, "fly-client-ip")
  )
}

function buildFbc(request: RequestLike | undefined, cookies: Map<string, string>): string | undefined {
  const cookieFbc = normalizeString(cookies.get("_fbc"))

  if (cookieFbc) {
    return cookieFbc
  }

  const fbclid =
    getQueryValue(request, "fbclid") ||
    getHeader(request, "x-fbclid") ||
    getHeader(request, "fbclid")

  if (!fbclid) {
    return undefined
  }

  return `fb.1.${Date.now()}.${fbclid}`
}

function resolveSourceUrl(request: RequestLike | undefined, explicitUrl?: string): string | undefined {
  if (explicitUrl) {
    return explicitUrl
  }

  const headerUrl =
    getHeader(request, "x-event-source-url") ||
    getHeader(request, "x-source-url") ||
    getHeader(request, "referer") ||
    getHeader(request, "referrer")

  if (headerUrl) {
    return headerUrl
  }

  const host = getHeader(request, "x-forwarded-host") || getHeader(request, "host")
  const protocol = getHeader(request, "x-forwarded-proto") || "https"
  const path = normalizeString(request?.originalUrl) || normalizeString(request?.url)

  if (!host || !path) {
    return undefined
  }

  return `${protocol}://${host}${path}`
}

function resolveUser(request: RequestLike | undefined, user?: TrackingUser): TrackingUser {
  const cookies = parseCookies(getHeader(request, "cookie"))

  return {
    email: normalizeLowercase(user?.email),
    phone: normalizeDigits(user?.phone),
    externalId: normalizeString(user?.externalId),
    firstName: normalizeLowercase(user?.firstName),
    lastName: normalizeLowercase(user?.lastName),
    fbp: normalizeString(user?.fbp) || normalizeString(cookies.get("_fbp")),
    fbc: normalizeString(user?.fbc) || buildFbc(request, cookies),
    ttp: normalizeString(user?.ttp) || normalizeString(cookies.get("_ttp")),
    ttclid:
      normalizeString(user?.ttclid) ||
      getQueryValue(request, "ttclid") ||
      getHeader(request, "x-ttclid"),
    clientIpAddress: normalizeString(user?.clientIpAddress) || extractClientIpAddress(request),
    clientUserAgent:
      normalizeString(user?.clientUserAgent) || getHeader(request, "user-agent"),
  }
}

function resolveContentType(items: TrackingItem[]): string | undefined {
  const firstType = items.find((item) => normalizeString(item.contentType))?.contentType
  return normalizeString(firstType) || "product"
}

function resolveValue(input: TrackCommerceEventInput): number | undefined {
  if (typeof input.value === "number" && Number.isFinite(input.value)) {
    return input.value
  }

  const itemTotal = input.items.reduce((sum, item) => {
    const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity)
      ? item.quantity
      : 1
    const price = typeof item.price === "number" && Number.isFinite(item.price)
      ? item.price
      : 0

    return sum + quantity * price
  }, 0)

  return itemTotal > 0 ? itemTotal : undefined
}

function resolveCurrency(currency: string | undefined): string | undefined {
  const normalized = normalizeString(currency)
  return normalized ? normalized.toUpperCase() : undefined
}

function getRequestTimeoutSignal(): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return undefined
  }

  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

async function sendMetaEvent(input: TrackCommerceEventInput) {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    return
  }

  const resolvedUser = resolveUser(input.request, input.user)
  const sourceUrl = resolveSourceUrl(input.request, input.sourceUrl)
  const value = resolveValue(input)
  const currency = resolveCurrency(input.currency)
  const contents = input.items.map((item) => ({
    id: item.contentId,
    quantity:
      typeof item.quantity === "number" && Number.isFinite(item.quantity)
        ? item.quantity
        : 1,
    ...(typeof item.price === "number" && Number.isFinite(item.price)
      ? { item_price: item.price }
      : {}),
  }))

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        ...(sourceUrl ? { event_source_url: sourceUrl } : {}),
        user_data: {
          ...(sha256(resolvedUser.email) ? { em: sha256(resolvedUser.email) } : {}),
          ...(sha256(resolvedUser.phone) ? { ph: sha256(resolvedUser.phone) } : {}),
          ...(sha256(resolvedUser.externalId)
            ? { external_id: sha256(resolvedUser.externalId) }
            : {}),
          ...(sha256(resolvedUser.firstName) ? { fn: sha256(resolvedUser.firstName) } : {}),
          ...(sha256(resolvedUser.lastName) ? { ln: sha256(resolvedUser.lastName) } : {}),
          ...(resolvedUser.fbp ? { fbp: resolvedUser.fbp } : {}),
          ...(resolvedUser.fbc ? { fbc: resolvedUser.fbc } : {}),
          ...(resolvedUser.clientIpAddress
            ? { client_ip_address: resolvedUser.clientIpAddress }
            : {}),
          ...(resolvedUser.clientUserAgent
            ? { client_user_agent: resolvedUser.clientUserAgent }
            : {}),
        },
        custom_data: {
          ...(currency ? { currency } : {}),
          ...(typeof value === "number" ? { value } : {}),
          ...(input.orderId ? { order_id: input.orderId } : {}),
          ...(contents.length > 0 ? { contents } : {}),
          ...(contents.length > 0
            ? { content_ids: contents.map((item) => item.id) }
            : {}),
          ...(resolveContentType(input.items)
            ? { content_type: resolveContentType(input.items) }
            : {}),
          ...(input.eventName === "InitiateCheckout"
            ? {
              num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
            }
            : {}),
        },
      },
    ],
    access_token: META_ACCESS_TOKEN,
  }

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: getRequestTimeoutSignal(),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Meta CAPI request failed (${response.status}): ${body.slice(0, 500)}`)
  }
}


async function sendTikTokEvent(input: TrackCommerceEventInput) {
  if (!TIKTOK_PIXEL_CODE || !TIKTOK_ACCESS_TOKEN) {
    return
  }

  const resolvedUser = resolveUser(input.request, input.user)
  const sourceUrl = resolveSourceUrl(input.request, input.sourceUrl)
  const value = resolveValue(input)
  const currency = resolveCurrency(input.currency)
  const contents = input.items.map((item) => ({
    content_id: item.contentId,
    content_type: normalizeString(item.contentType) || "product",
    ...(normalizeString(item.contentName) ? { content_name: item.contentName } : {}),
    ...(normalizeString(item.contentCategory)
      ? { content_category: item.contentCategory }
      : {}),
    ...(typeof item.quantity === "number" && Number.isFinite(item.quantity)
      ? { quantity: item.quantity }
      : { quantity: 1 }),
    ...(typeof item.price === "number" && Number.isFinite(item.price)
      ? { price: item.price }
      : {}),
  }))

  const payload = {
    event_source: "web",
    pixel_code: TIKTOK_PIXEL_CODE, // Omitimos event_source_id
    event: input.eventName,
    event_id: input.eventId,
    timestamp: Math.floor(Date.now() / 1000),
    context: {
      ...(sourceUrl ? { page: { url: sourceUrl } } : {}),
      ...(resolvedUser.clientIpAddress ? { ip: resolvedUser.clientIpAddress } : {}),
      ...(resolvedUser.clientUserAgent
        ? { user_agent: resolvedUser.clientUserAgent }
        : {}),
      ...(resolvedUser.ttclid ? { ad: { callback: resolvedUser.ttclid } } : {}),
      user: {
        ...(sha256(resolvedUser.email) ? { email: sha256(resolvedUser.email) } : {}),
        ...(sha256(resolvedUser.phone)
          ? { phone_number: sha256(resolvedUser.phone) }
          : {}),
        ...(sha256(resolvedUser.externalId)
          ? { external_id: sha256(resolvedUser.externalId) }
          : {}),
        ...(resolvedUser.ttp ? { ttp: resolvedUser.ttp } : {}),
      },
    },
    properties: {
      ...(currency ? { currency } : {}),
      ...(typeof value === "number" ? { value } : {}),
      ...(contents.length > 0 ? { contents } : {}),
      ...(contents.length > 0
        ? { content_ids: contents.map((item) => item.content_id) }
        : {}),
      ...(normalizeString(input.description)
        ? { description: input.description }
        : {}),
      ...(contents.length > 0
        ? {
          quantity: contents.reduce((sum, item) => sum + item.quantity, 0),
          content_type: resolveContentType(input.items),
        }
        : {}),
    },
    // ❌ ELIMINADO: access_token: TIKTOK_ACCESS_TOKEN
  }

  const response = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/pixel/track/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": TIKTOK_ACCESS_TOKEN, // ✅ AGREGADO AQUÍ
      },
      body: JSON.stringify(payload),
      signal: getRequestTimeoutSignal(),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`TikTok Events API request failed (${response.status}): ${body.slice(0, 500)}`)
  }
}

export async function trackCommerceEvent(input: TrackCommerceEventInput) {
  const logger = input.logger

  const tasks = [
    sendMetaEvent(input),
    sendTikTokEvent(input),
  ]

  const results = await Promise.allSettled(tasks)

  results.forEach((result, index) => {
    if (result.status !== "rejected") {
      return
    }

    const provider = index === 0 ? "Meta" : "TikTok"
    logger?.error?.(
      `[tracking] ${provider} ${input.eventName} failed for event_id=${input.eventId}`,
      result.reason
    )
  })
}
