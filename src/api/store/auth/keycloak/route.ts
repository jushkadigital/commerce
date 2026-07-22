import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import * as jwt from "jsonwebtoken"
import { provisionCustomerFromKeycloak } from "../../../../workflows/helpers/provision-customer-from-keycloak"

const MEDUSA_JWT_COOKIE_NAME = "_medusa_jwt"
const MEDUSA_JWT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

type JsonRecord = Record<string, unknown>

function setNoStoreHeaders(res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
}

function resolveCookieConfig() {
  const isProduction = process.env.NODE_ENV === "production"
  const configuredDomain =
    process.env.AUTH_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: MEDUSA_JWT_MAX_AGE_MS,
    path: "/",
    domain: configuredDomain || (isProduction ? ".patarutera.pe" : undefined),
  }
}

function getPayloadValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === "string" ? value : undefined
}

function extractBearerToken(authorization?: string) {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return undefined
  }

  const value = authorization.slice("Bearer ".length).trim()
  return value.length > 0 ? value : undefined
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function extractTokenFromBody(body: unknown) {
  if (!isJsonRecord(body)) {
    return undefined
  }

  const directCandidates = [
    body.accessToken,
    body.access_token,
    body.keycloakToken,
    body.keycloak_token,
    body.id_token,
    body.token,
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  const nestedSources = [body.data, body.payload, body.body]

  for (const source of nestedSources) {
    if (!isJsonRecord(source)) {
      continue
    }

    const nestedCandidates = [
      source.accessToken,
      source.access_token,
      source.keycloakToken,
      source.keycloak_token,
      source.id_token,
      source.token,
    ]

    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim()
      }
    }
  }

  return undefined
}

async function resolveTokenPayload(
  accessToken: string
): Promise<Record<string, unknown> | undefined> {
  const decoded = jwt.decode(accessToken, { complete: true })

  if (decoded && typeof decoded === "object" && typeof decoded.payload === "object") {
    return decoded.payload as Record<string, unknown>
  }

  const keycloakUrl = process.env.KEYCLOAK_URL
  const keycloakRealm = process.env.KEYCLOAK_REALM

  if (!keycloakUrl || !keycloakRealm) {
    return undefined
  }

  const userInfoUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`

  try {
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userInfoResponse.ok) {
      return undefined
    }

    const userInfo = (await userInfoResponse.json()) as unknown

    if (!isJsonRecord(userInfo)) {
      return undefined
    }

    return userInfo
  } catch {
    return undefined
  }
}

function verifyMedusaCustomerToken(
  token: string,
  jwtSecret: string
): { customerId: string } | undefined {
  try {
    const verified = jwt.verify(token, jwtSecret)

    if (!verified || typeof verified !== "object") {
      return undefined
    }

    const verifiedPayload = verified as Record<string, unknown>
    const actorType = getPayloadValue(verifiedPayload, "actor_type")
    const actorId = getPayloadValue(verifiedPayload, "actor_id")

    if (actorType !== "customer" || !actorId) {
      return undefined
    }

    return { customerId: actorId }
  } catch {
    return undefined
  }
}

function respondWithCustomerSession(params: {
  req: MedusaRequest
  res: MedusaResponse
  customerId: string
  token: string
  mode: "keycloak_exchange" | "medusa_passthrough"
}): any {
  const { req, res, customerId, token, mode } = params

  req.session.customer_id = customerId

  const cookieConfig = resolveCookieConfig()

  res.cookie(MEDUSA_JWT_COOKIE_NAME, token, cookieConfig)

  const setCookieHeader = res.getHeader("Set-Cookie")
  const emittedCookie =
    typeof setCookieHeader === "string"
      ? setCookieHeader.includes(`${MEDUSA_JWT_COOKIE_NAME}=`)
      : Array.isArray(setCookieHeader)
        ? setCookieHeader.some((entry) =>
            String(entry).includes(`${MEDUSA_JWT_COOKIE_NAME}=`)
          )
        : false

  if (!emittedCookie) {
    console.error("[store.auth.keycloak] Set-Cookie header missing for _medusa_jwt", {
      route: "/store/auth/keycloak",
      status: 500,
      emitted_medusa_jwt: false,
      customer_id: customerId,
      cookie_name: MEDUSA_JWT_COOKIE_NAME,
      mode,
    })

    return res.status(500).json({
      message: "No se pudo emitir _medusa_jwt",
      code: "MISSING_MEDUSA_JWT",
    })
  }

  return res.json({
    message: "Login exitoso",
    customer_id: customerId,
    token,
  })
}

function buildLogLine(message: string, context: Record<string, unknown>) {
  return `${message} ${JSON.stringify(context)}`
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tokenFromBody = extractTokenFromBody(req.body)
  const tokenFromHeader = extractBearerToken(req.headers.authorization)
  const accessToken = tokenFromBody || tokenFromHeader
  const bodyKeys = isJsonRecord(req.body) ? Object.keys(req.body) : []

  setNoStoreHeaders(res)

  try {
    if (!accessToken) {
      return res.status(400).json({
        message: "Keycloak token is required",
        code: "MISSING_TOKEN",
        details: {
          accepted_fields: [
            "accessToken",
            "access_token",
            "token",
            "id_token",
            "keycloak_token",
            "keycloakToken",
            "Authorization: Bearer <token>",
          ],
          received_body_keys: bodyKeys,
        },
      })
    }

    const payload = await resolveTokenPayload(accessToken)

    const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http

    if (!payload) {
      return res.status(400).json({
        message: "Invalid Keycloak token",
        code: "INVALID_TOKEN",
        reason: "TOKEN_DECODE_AND_USERINFO_FAILED",
        details: {
          token_source: tokenFromBody ? "body" : tokenFromHeader ? "authorization" : "none",
        },
      })
    }

    const keycloakSub = getPayloadValue(payload, "sub")
    const keycloakEmail = getPayloadValue(payload, "email")

    if (!keycloakSub) {
      if (jwtSecret && typeof jwtSecret === "string") {
        const medusaTokenPayload = verifyMedusaCustomerToken(accessToken, jwtSecret)

        if (medusaTokenPayload?.customerId) {
          return respondWithCustomerSession({
            req,
            res,
            customerId: medusaTokenPayload.customerId,
            token: accessToken,
            mode: "medusa_passthrough",
          })
        }
      }

      return res.status(400).json({
        message: "Invalid token: missing 'sub' claim",
        code: "INVALID_TOKEN",
        reason: "MISSING_SUB_AND_NOT_A_VALID_MEDUSA_CUSTOMER_TOKEN",
        details: {
          keycloak_email: keycloakEmail,
        },
      })
    }

    const authModule = req.scope.resolve(Modules.AUTH)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "keycloak-store",
      entity_id: keycloakSub,
    })

    // JIT Provisioning: create AuthIdentity + Customer on demand
    // when the subscriber hasn't processed the RabbitMQ event yet,
    // so the front gets a valid Medusa token on the first attempt.
    let customerId: string
    let authIdentityId: string

    if (!providerIdentity || !providerIdentity.auth_identity_id) {
      if (!keycloakEmail) {
        return res.status(400).json({
          message: "Cannot JIT provision customer: email missing from Keycloak token",
          code: "MISSING_EMAIL_FOR_JIT",
          sub: keycloakSub,
        })
      }

      const jitResult = await provisionCustomerFromKeycloak({
        container: req.scope,
        keycloakSub,
        keycloakEmail,
        firstName: getPayloadValue(payload, "given_name"),
        lastName: getPayloadValue(payload, "family_name"),
      })

      customerId = jitResult.customerId
      authIdentityId = jitResult.authIdentityId
    } else {
      const authIdentity = await authModule.retrieveAuthIdentity(
        providerIdentity.auth_identity_id
      )
      authIdentityId = authIdentity.id

      const appMetadataCustomerId = authIdentity.app_metadata?.customer_id as string | undefined
      customerId = appMetadataCustomerId ?? ""

      if (!customerId) {
        if (!keycloakEmail) {
          return res.status(400).json({
            message: "Cannot JIT provision customer: email missing from Keycloak token",
            code: "MISSING_EMAIL_FOR_JIT",
            sub: keycloakSub,
          })
        }

        const jitResult = await provisionCustomerFromKeycloak({
          container: req.scope,
          keycloakSub,
          keycloakEmail,
          firstName: getPayloadValue(payload, "given_name"),
          lastName: getPayloadValue(payload, "family_name"),
        })

        customerId = jitResult.customerId
        authIdentityId = jitResult.authIdentityId
      }
    }

    if (!jwtSecret || typeof jwtSecret !== "string") {
      return res.status(500).json({
        message: "No se pudo emitir _medusa_jwt",
        code: "MISSING_MEDUSA_JWT",
      })
    }

    const token = jwt.sign(
      {
        actor_id: customerId,
        actor_type: "customer",
        auth_identity_id: authIdentityId,
      },
      jwtSecret,
      { expiresIn: "7d" }
    )

    if (!token || typeof token !== "string") {
      return res.status(500).json({
        message: "No se pudo emitir _medusa_jwt",
        code: "MISSING_MEDUSA_JWT",
      })
    }

    return respondWithCustomerSession({
      req,
      res,
      customerId,
      token,
      mode: "keycloak_exchange",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error"

    console.error("[store.auth.keycloak] unexpected error", {
      route: "/store/auth/keycloak",
      status: 500,
      emitted_medusa_jwt: false,
      error: errorMessage,
    })

    return res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_ERROR",
      error: errorMessage,
    })
  }
}