import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import * as jwt from "jsonwebtoken"

const MEDUSA_JWT_COOKIE_NAME = "_medusa_jwt"
const MEDUSA_JWT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

type LoggerLike = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

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
  accessToken: string,
  logger: LoggerLike
): Promise<Record<string, unknown> | undefined> {
  const decoded = jwt.decode(accessToken, { complete: true })

  if (decoded && typeof decoded === "object" && typeof decoded.payload === "object") {
    return decoded.payload as Record<string, unknown>
  }

  const keycloakUrl = process.env.KEYCLOAK_URL
  const keycloakRealm = process.env.KEYCLOAK_REALM

  if (!keycloakUrl || !keycloakRealm) {
    logger.warn(
      buildLogLine("[store.auth.keycloak] cannot resolve token payload via userinfo", {
        reason: "missing_keycloak_env",
        has_keycloak_url: Boolean(keycloakUrl),
        has_keycloak_realm: Boolean(keycloakRealm),
      })
    )

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
      logger.warn(
        buildLogLine("[store.auth.keycloak] userinfo rejected token", {
          status: userInfoResponse.status,
        })
      )

      return undefined
    }

    const userInfo = (await userInfoResponse.json()) as unknown

    if (!isJsonRecord(userInfo)) {
      logger.warn(
        buildLogLine("[store.auth.keycloak] userinfo payload is not an object", {
          token_length: accessToken.length,
        })
      )

      return undefined
    }

    return userInfo
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error"

    logger.warn(
      buildLogLine("[store.auth.keycloak] userinfo fetch failed", {
        error: errorMessage,
      })
    )

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
  logger: LoggerLike
  customerId: string
  token: string
  mode: "keycloak_exchange" | "medusa_passthrough"
}) {
  const { req, res, logger, customerId, token, mode } = params

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
    params.logger.error(
      buildLogLine("[store.auth.keycloak] Set-Cookie header missing for _medusa_jwt", {
        route: "/store/auth/keycloak",
        status: 500,
        emitted_medusa_jwt: false,
        customer_id: customerId,
        cookie_name: MEDUSA_JWT_COOKIE_NAME,
        mode,
      })
    )

    return res.status(500).json({
      message: "No se pudo emitir _medusa_jwt",
      code: "MISSING_MEDUSA_JWT",
    })
  }

  logger.info(
    buildLogLine("[store.auth.keycloak] _medusa_jwt emitted", {
      route: "/store/auth/keycloak",
      status: 200,
      emitted_medusa_jwt: true,
      customer_id: customerId,
      cookie_name: MEDUSA_JWT_COOKIE_NAME,
      cookie_domain: cookieConfig.domain,
      cookie_same_site: cookieConfig.sameSite,
      cookie_secure: cookieConfig.secure,
      cookie_path: cookieConfig.path,
      mode,
    })
  )

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
  const logger = req.scope.resolve("logger") as LoggerLike
  const tokenFromBody = extractTokenFromBody(req.body)
  const tokenFromHeader = extractBearerToken(req.headers.authorization)
  const accessToken = tokenFromBody || tokenFromHeader
  const bodyKeys = isJsonRecord(req.body) ? Object.keys(req.body) : []

  setNoStoreHeaders(res)

  logger.info(
    buildLogLine("[store.auth.keycloak] request received", {
      route: "/store/auth/keycloak",
      has_access_token: Boolean(accessToken),
      access_token_length: accessToken?.length,
      token_source: tokenFromBody ? "body" : tokenFromHeader ? "authorization" : "none",
      body_keys: bodyKeys,
    })
  )

  try {
    if (!accessToken) {
      logger.warn(
        buildLogLine("[store.auth.keycloak] missing accessToken", {
          route: "/store/auth/keycloak",
          status: 400,
          emitted_medusa_jwt: false,
          token_source: "none",
          body_keys: bodyKeys,
        })
      )

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

    const payload = await resolveTokenPayload(accessToken, logger)

    const { jwtSecret } = req.scope.resolve("configModule").projectConfig.http

    if (!payload) {
      logger.warn(
        buildLogLine("[store.auth.keycloak] unable to decode token and userinfo fallback failed", {
          route: "/store/auth/keycloak",
          status: 400,
          emitted_medusa_jwt: false,
          token_source: tokenFromBody ? "body" : tokenFromHeader ? "authorization" : "none",
        })
      )

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
          logger.info(
            buildLogLine("[store.auth.keycloak] received Medusa customer token; issuing cookie passthrough", {
              route: "/store/auth/keycloak",
              customer_id: medusaTokenPayload.customerId,
            })
          )

          return respondWithCustomerSession({
            req,
            res,
            logger,
            customerId: medusaTokenPayload.customerId,
            token: accessToken,
            mode: "medusa_passthrough",
          })
        }
      }

      logger.warn(
        buildLogLine("[store.auth.keycloak] token missing sub claim", {
          route: "/store/auth/keycloak",
          status: 400,
          emitted_medusa_jwt: false,
          keycloak_email: keycloakEmail,
        })
      )

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

    logger.info(
      buildLogLine("[store.auth.keycloak] searching provider identity", {
        keycloak_sub: keycloakSub,
      })
    )

    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "keycloak-store",
      entity_id: keycloakSub,
    })

    if (!providerIdentity) {
      logger.warn(
        buildLogLine("[store.auth.keycloak] provider identity not found", {
          route: "/store/auth/keycloak",
          status: 404,
          emitted_medusa_jwt: false,
          keycloak_sub: keycloakSub,
          keycloak_email: keycloakEmail,
        })
      )

      return res.status(404).json({
        message: "Usuario no encontrado. El subscriber aún no ha sincronizado este usuario.",
        code: "NOT_SYNCED_YET",
        suggestion: "Por favor espere unos segundos y reintente.",
        sub: keycloakSub,
        email: keycloakEmail,
      })
    }

    if (!providerIdentity.auth_identity_id) {
      logger.warn(
        buildLogLine("[store.auth.keycloak] provider identity missing auth_identity_id", {
          route: "/store/auth/keycloak",
          status: 404,
          emitted_medusa_jwt: false,
          keycloak_sub: keycloakSub,
        })
      )

      return res.status(404).json({
        message: "Usuario no encontrado. El subscriber aún no ha sincronizado este usuario.",
        code: "NOT_SYNCED_YET",
        suggestion: "Por favor espere unos segundos y reintente.",
        sub: keycloakSub,
        email: keycloakEmail,
      })
    }

    const authIdentity = await authModule.retrieveAuthIdentity(
      providerIdentity.auth_identity_id
    )

    let customerId = authIdentity.app_metadata?.customer_id as string

    if (!customerId) {
      logger.warn(
        buildLogLine(
          "[store.auth.keycloak] customer_id missing in app_metadata, using email fallback",
          {
            keycloak_sub: keycloakSub,
          }
        )
      )

      const authIdentityRecord = authIdentity as {
        user_metadata?: Record<string, unknown>
      }

      const fallbackEmail =
        keycloakEmail || getPayloadValue(authIdentityRecord.user_metadata ?? {}, "email")

      logger.info(
        buildLogLine("[store.auth.keycloak] searching customer by fallback email", {
          has_email: Boolean(fallbackEmail),
        })
      )

      if (!fallbackEmail) {
        logger.warn(
          buildLogLine("[store.auth.keycloak] fallback email unavailable", {
            route: "/store/auth/keycloak",
            status: 404,
            emitted_medusa_jwt: false,
            keycloak_sub: keycloakSub,
          })
        )

        return res.status(404).json({
          message: "Cliente no encontrado. El subscriber aún no ha creado la cuenta.",
          code: "CUSTOMER_NOT_CREATED_YET",
          suggestion: "Por favor espere unos segundos y reintente.",
          email: null,
        })
      }

      const [customer] = await customerModule.listCustomers({ email: fallbackEmail })

      if (customer) {
        customerId = customer.id

        await authModule.updateAuthIdentities([{
          id: authIdentity.id,
          app_metadata: {
            ...authIdentity.app_metadata,
            customer_id: customerId,
          },
        }])

        logger.info(
          buildLogLine(
            "[store.auth.keycloak] linked auth identity to customer via email fallback",
            {
              customer_id: customerId,
              keycloak_sub: keycloakSub,
            }
          )
        )
      } else {
        logger.warn(
          buildLogLine("[store.auth.keycloak] fallback customer not found", {
            route: "/store/auth/keycloak",
            status: 404,
            emitted_medusa_jwt: false,
            keycloak_sub: keycloakSub,
            keycloak_email: fallbackEmail,
          })
        )

        return res.status(404).json({
          message: "Cliente no encontrado. El subscriber aún no ha creado la cuenta.",
          code: "CUSTOMER_NOT_CREATED_YET",
          suggestion: "Por favor espere unos segundos y reintente.",
          email: fallbackEmail,
        })
      }
    }

    if (!jwtSecret || typeof jwtSecret !== "string") {
      logger.error(
        buildLogLine("[store.auth.keycloak] jwtSecret unavailable; cannot emit _medusa_jwt", {
          route: "/store/auth/keycloak",
          status: 500,
          emitted_medusa_jwt: false,
          customer_id: customerId,
        })
      )

      return res.status(500).json({
        message: "No se pudo emitir _medusa_jwt",
        code: "MISSING_MEDUSA_JWT",
      })
    }

    const token = jwt.sign(
      {
        actor_id: customerId,
        actor_type: "customer",
        auth_identity_id: authIdentity.id,
        app_metadata: authIdentity.app_metadata,
      },
      jwtSecret,
      { expiresIn: "7d" }
    )

    if (!token || typeof token !== "string") {
      logger.error(
        buildLogLine("[store.auth.keycloak] token generation failed", {
          route: "/store/auth/keycloak",
          status: 500,
          emitted_medusa_jwt: false,
          customer_id: customerId,
        })
      )

      return res.status(500).json({
        message: "No se pudo emitir _medusa_jwt",
        code: "MISSING_MEDUSA_JWT",
      })
    }

    return respondWithCustomerSession({
      req,
      res,
      logger,
      customerId,
      token,
      mode: "keycloak_exchange",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error"

    logger.error(
      buildLogLine("[store.auth.keycloak] unexpected error", {
        route: "/store/auth/keycloak",
        status: 500,
        emitted_medusa_jwt: false,
        error: errorMessage,
      })
    )

    return res.status(500).json({
      message: "Error interno del servidor",
      code: "INTERNAL_ERROR",
      error: errorMessage,
    })
  }
}
