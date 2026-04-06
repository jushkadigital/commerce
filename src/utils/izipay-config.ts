type IzipayRuntimeEnvironment = "development" | "production"

type IzipayResolvedConfig = {
  runtimeEnvironment: IzipayRuntimeEnvironment
  merchantCode?: string
  publicKey?: string
  hashKey?: string
  apiEndpoint?: string
  sdkUrl?: string
  tokenEndpoint?: string
}

const DEVELOPMENT_DEFAULTS = {
  apiEndpoint: "https://testapi-pw.izipay.pe",
  sdkUrl: "https://testcheckout.izipay.pe/payments/v1/js/index.js",
  tokenEndpoint: "https://sandbox-api-pw.izipay.pe/security/v1/Token/Generate",
} as const

function normalizeValue(value?: string) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readEnvValue(keys: string[]) {
  for (const key of keys) {
    const value = normalizeValue(process.env[key])

    if (value) {
      return value
    }
  }

  return undefined
}

export function resolveIzipayRuntimeEnvironment(
  nodeEnv = process.env.NODE_ENV
): IzipayRuntimeEnvironment {
  return nodeEnv === "production" ? "production" : "development"
}

export function resolveIzipayConfig(
  nodeEnv = process.env.NODE_ENV
): IzipayResolvedConfig {
  const runtimeEnvironment = resolveIzipayRuntimeEnvironment(nodeEnv)
  const envPrefix =
    runtimeEnvironment === "production"
      ? "IZIPAY_PRODUCTION"
      : "IZIPAY_DEVELOPMENT"

  return {
    runtimeEnvironment,
    merchantCode: readEnvValue([`${envPrefix}_MERCHANT_CODE`]),
    publicKey: readEnvValue([`${envPrefix}_PUBLIC_KEY`]),
    hashKey: readEnvValue([`${envPrefix}_HASH_KEY`]),
    apiEndpoint:
      readEnvValue([`${envPrefix}_API_ENDPOINT`]) ??
      (runtimeEnvironment === "development"
        ? DEVELOPMENT_DEFAULTS.apiEndpoint
        : undefined),
    sdkUrl:
      readEnvValue([`${envPrefix}_SDK_URL`]) ??
      (runtimeEnvironment === "development"
        ? DEVELOPMENT_DEFAULTS.sdkUrl
        : undefined),
    tokenEndpoint:
      readEnvValue([`${envPrefix}_TOKEN_ENDPOINT`]) ??
      (runtimeEnvironment === "development"
        ? DEVELOPMENT_DEFAULTS.tokenEndpoint
        : undefined),
  }
}

export function isIzipayProviderConfigured(nodeEnv = process.env.NODE_ENV) {
  const config = resolveIzipayConfig(nodeEnv)

  return Boolean(
    config.merchantCode &&
      config.publicKey &&
      config.hashKey &&
      config.apiEndpoint &&
      config.sdkUrl &&
      config.tokenEndpoint
  )
}
