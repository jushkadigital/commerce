import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

// ========================================================================
// 1. DETECCIÓN DE MODO BUILD (CRÍTICO PARA DOCKER)
// ========================================================================
// Si estamos compilando, esta variable será true.
// Esto nos permitirá apagar conexiones a DB/Redis/RabbitMQ durante el build.
const IS_BUILD = process.env.IS_BUILD === 'true' || process.env.npm_lifecycle_event === 'build';

console.log("NODE_ENV =", process.env.NODE_ENV)
console.log("CWD =", process.cwd())
console.log("IS_BUILD MODE =", IS_BUILD) // Log para confirmar en consola

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// ========================================================================
// 2. CARGA DE VARIABLES DE ENTORNO
// ========================================================================

// Logs de depuración (puedes quitarlos en prod si quieres)
console.log("KEYCLOAK_CLIENT_ID:", process.env.KEYCLOAK_CLIENT_ID)
console.log("BACKEND_URL:", process.env.BACKEND_URL)
console.log("MEDUSA_BACKEND_URL:", process.env.MEDUSA_BACKEND_URL)

const DATABASE_URL = process.env.DATABASE_URL
const REDIS_URL = process.env.REDIS_URL
const DEPLOYMENT_TYPE = process.env.DEPLOYMENT_TYPE || 'local'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:9000'
const STORE_CORS = process.env.STORE_CORS || BACKEND_URL
const ADMIN_CORS = process.env.ADMIN_CORS || BACKEND_URL
const AUTH_CORS = process.env.AUTH_CORS || BACKEND_URL
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'supersecret'

const IS_ADMIN_DISABLED = process.env.IS_ADMIN_DISABLED === 'true'

// Redis URLs
const CACHE_REDIS_URL = process.env.CACHE_REDIS_URL
const EVENTS_REDIS_URL = process.env.EVENTS_REDIS_URL
const WE_REDIS_URL = process.env.WE_REDIS_URL
const LOCKING_REDIS_URL = process.env.LOCKING_REDIS_URL

// MinIO / S3 Vars
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT
const MINIO_ACCESS_KEY_ID = process.env.MINIO_ACCESS_KEY_ID
const MINIO_SECRET_ACCESS_KEY = process.env.MINIO_SECRET_ACCESS_KEY
const MINIO_REGION = process.env.MINIO_REGION
const MINIO_BUCKET = process.env.MINIO_BUCKET
const MINIO_FILE_URL = process.env.MINIO_FILE_URL

const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY
const S3_REGION = process.env.S3_REGION
const S3_BUCKET = process.env.S3_BUCKET
const S3_FILE_URL = process.env.S3_FILE_URL

// Email providers
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL

// Payment Providers
const STRIPE_API_KEY = process.env.STRIPE_API_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Izipay Configuration
const IZIPAY_MERCHANT_CODE = process.env.IZIPAY_MERCHANT_CODE
const IZIPAY_PUBLIC_KEY = process.env.IZIPAY_PUBLIC_KEY
const IZIPAY_HASH_KEY = process.env.IZIPAY_HASH_KEY
const IZIPAY_API_ENDPOINT = process.env.IZIPAY_API_ENDPOINT
const IZIPAY_SDK_URL = process.env.IZIPAY_SDK_URL

// Search
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY

// Keycloak SSO Configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET
const KEYCLOAK_CALLBACK_URL = process.env.KEYCLOAK_CALLBACK_URL || `${BACKEND_URL}/app/login`
const KEYCLOAK_STORE_CLIENT_ID = process.env.KEYCLOAK_STORE_CLIENT_ID
const KEYCLOAK_STORE_CLIENT_SECRET = process.env.KEYCLOAK_STORE_CLIENT_SECRET


// ========================================================================
// 3. EXPORTACIÓN DE LA CONFIGURACIÓN
// ========================================================================

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    ...(DEPLOYMENT_TYPE === 'local' ? {
      databaseDriverOptions: {
        ssl: false,
        sslmode: 'disable',
      },
    } : {}),
    // FIX: Si es build, anulamos Redis global para evitar conexiones del core
    redisUrl: IS_BUILD ? undefined : REDIS_URL,

    http: {
      storeCors: STORE_CORS,
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET,
      // Configure auth methods per actor type
      ...(KEYCLOAK_URL && KEYCLOAK_CLIENT_ID ? {
        authMethodsPerActor: {
          user: ["emailpass", "keycloak-admin"],
          customer: ["emailpass", "keycloak-store"],
        },
      } : {}),
    }
  },
  admin: {
    backendUrl: BACKEND_URL,
    disable: IS_ADMIN_DISABLED,
  },
  modules: [
    // --------------------------------------------------------------------
    // CACHE MODULE (REDIS vs IN-MEMORY)
    // --------------------------------------------------------------------
    {
      key: Modules.CACHING,
      // LOGICA: Si es Build -> In-Memory. Si no -> Redis (si hay URL) o In-Memory (default)
      resolve: IS_BUILD
        ? '@medusajs/medusa/cache-inmemory'
        : (CACHE_REDIS_URL ? '@medusajs/medusa/cache-redis' : '@medusajs/medusa/cache-inmemory'),
      options: {
        // Si usamos cache-inmemory, esta opción se ignora, así que es seguro dejarla
        redisUrl: CACHE_REDIS_URL,
      },
    },

    // --------------------------------------------------------------------
    // EVENT BUS (RABBITMQ vs LOCAL)
    // --------------------------------------------------------------------
    {
      key: Modules.EVENT_BUS,
      // LOGICA: Si es Build -> Local. Si no -> Tu RabbitMQ custom
      resolve: IS_BUILD
        ? "@medusajs/medusa/event-bus-local"
        : "./src/modules/event-bus-rabbitmq",
      options: {
        url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@172.17.0.1:5672',
        exchange: "tourism-exchange",
      },
    },

    // --------------------------------------------------------------------
    // WORKFLOW ENGINE (REDIS vs IN-MEMORY)
    // --------------------------------------------------------------------
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: IS_BUILD
        ? '@medusajs/medusa/workflow-engine-inmemory'
        : (WE_REDIS_URL ? '@medusajs/medusa/workflow-engine-redis' : '@medusajs/medusa/workflow-engine-inmemory'),
      options: {
        redis: {
          url: WE_REDIS_URL,
        },
      },
    },

    // --------------------------------------------------------------------
    // LOCKING (REDIS vs IN-MEMORY)
    // --------------------------------------------------------------------
    ...(LOCKING_REDIS_URL && !IS_BUILD ? [{
      key: Modules.LOCKING,
      resolve: '@medusajs/medusa/locking',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/locking-redis',
            id: 'locking-redis',
            is_default: true,
            options: {
              redisUrl: LOCKING_REDIS_URL,
            },
          },
        ],
      },
    }] : []),

    // --------------------------------------------------------------------
    // FILE MODULE (MINIO / S3 / LOCAL)
    // --------------------------------------------------------------------
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          ...(MINIO_ENDPOINT && MINIO_ACCESS_KEY_ID && MINIO_SECRET_ACCESS_KEY ? [{
            resolve: '@medusajs/medusa/file-s3',
            id: 'minio',
            options: {
              file_url: MINIO_FILE_URL,
              access_key_id: MINIO_ACCESS_KEY_ID,
              secret_access_key: MINIO_SECRET_ACCESS_KEY,
              region: MINIO_REGION,
              bucket: MINIO_BUCKET,
              endpoint: MINIO_ENDPOINT,
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          }] : []),
          ...(S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY ? [{
            resolve: '@medusajs/medusa/file-s3',
            id: 's3',
            options: {
              file_url: S3_FILE_URL,
              access_key_id: S3_ACCESS_KEY_ID,
              secret_access_key: S3_SECRET_ACCESS_KEY,
              region: S3_REGION,
              bucket: S3_BUCKET,
              endpoint: S3_ENDPOINT,
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          }] : []),
          // Fallback a local si no hay S3/MinIO
          ...(!MINIO_ENDPOINT && !S3_ENDPOINT ? [{
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: `${BACKEND_URL}/static`
            }
          }] : [])
        ],
      },
    },

    // --------------------------------------------------------------------
    // NOTIFICATIONS
    // --------------------------------------------------------------------
    ...((SENDGRID_API_KEY && SENDGRID_FROM_EMAIL) || (RESEND_API_KEY && RESEND_FROM_EMAIL) ? [{
      key: Modules.NOTIFICATION,
      resolve: '@medusajs/notification',
      options: {
        providers: [
          ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL ? [{
            resolve: '@medusajs/notification-sendgrid',
            id: 'sendgrid',
            options: {
              channels: ['email'],
              api_key: SENDGRID_API_KEY,
              from: SENDGRID_FROM_EMAIL,
            }
          }] : []),
          ...(RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
            resolve: './src/modules/email-notifications',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: RESEND_API_KEY,
              from: RESEND_FROM_EMAIL,
            },
          }] : []),
        ]
      }
    }] : []),

    // --------------------------------------------------------------------
    // PAYMENTS
    // --------------------------------------------------------------------
    ...((STRIPE_API_KEY && STRIPE_WEBHOOK_SECRET) || IZIPAY_MERCHANT_CODE ? [{
      key: Modules.PAYMENT,
      resolve: '@medusajs/payment',
      options: {
        providers: [
          // Stripe provider
          ...(STRIPE_API_KEY && STRIPE_WEBHOOK_SECRET ? [{
            resolve: '@medusajs/payment-stripe',
            id: 'stripe',
            options: {
              apiKey: STRIPE_API_KEY,
              webhookSecret: STRIPE_WEBHOOK_SECRET,
            },
          }] : []),
          // Izipay provider
          ...(IZIPAY_MERCHANT_CODE && IZIPAY_PUBLIC_KEY && IZIPAY_HASH_KEY ? [{
            resolve: './src/modules/izipay-payment',
            id: 'izipay',
            options: {
              merchantCode: IZIPAY_MERCHANT_CODE,
              publicKey: IZIPAY_PUBLIC_KEY,
              hashKey: IZIPAY_HASH_KEY,
              apiEndpoint: IZIPAY_API_ENDPOINT || 'https://testapi-pw.izipay.pe',
              sdkUrl: IZIPAY_SDK_URL || 'https://testcheckout.izipay.pe/payments/v1/js/index.js',
            },
          }] : []),
        ],
      },
    }] : []),

    // --------------------------------------------------------------------
    // CUSTOM MODULES
    // --------------------------------------------------------------------
    {
      resolve: './src/modules/tour-booking',
    },
    {
      resolve: './src/modules/package',
    },

    // --------------------------------------------------------------------
    // AUTH MODULE
    // --------------------------------------------------------------------
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          // Default emailpass provider
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          // Keycloak Admin
          {
            resolve: "./src/modules/keycloak-auth",
            id: "keycloak-admin",
            options: {
              keycloakUrl: KEYCLOAK_URL,
              realm: KEYCLOAK_REALM,
              clientId: KEYCLOAK_CLIENT_ID,
              clientSecret: KEYCLOAK_CLIENT_SECRET,
              callbackUrl: `${BACKEND_URL}/auth/user/keycloak-admin/callback`,
              scope: "openid profile email",
            },
          },
          // Keycloak Store
          {
            resolve: "./src/modules/keycloak-auth-store",
            id: "keycloak-store",
            options: {
              keycloakUrl: KEYCLOAK_URL,
              realm: KEYCLOAK_REALM,
              clientId: KEYCLOAK_STORE_CLIENT_ID,
              clientSecret: KEYCLOAK_STORE_CLIENT_SECRET,
              callbackUrl: `${BACKEND_URL}/auth/customer/keycloak-store/callback`,
              scope: "openid profile email",
            },
          }
        ],
      },
    },
  ],
  plugins: [
  ],
})
