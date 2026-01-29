import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'


console.log("NODE_ENV =", process.env.NODE_ENV)
console.log("CWD =", process.cwd())

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

console.log(process.env.KEYCLOAK_CLIENT_ID)
console.log(process.env.IZIPAY_HASH_KEY)
console.log(process.env.IZIPAY_MERCHANT_CODE)
console.log(process.env.STORE_CORS)
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

const CACHE_REDIS_URL = process.env.CACHE_REDIS_URL
const EVENTS_REDIS_URL = process.env.EVENTS_REDIS_URL
const WE_REDIS_URL = process.env.WE_REDIS_URL
const LOCKING_REDIS_URL = process.env.LOCKING_REDIS_URL

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

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL

const STRIPE_API_KEY = process.env.STRIPE_API_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Izipay Configuration
const IZIPAY_MERCHANT_CODE = process.env.IZIPAY_MERCHANT_CODE
const IZIPAY_PUBLIC_KEY = process.env.IZIPAY_PUBLIC_KEY
const IZIPAY_HASH_KEY = process.env.IZIPAY_HASH_KEY
const IZIPAY_API_ENDPOINT = process.env.IZIPAY_API_ENDPOINT
const IZIPAY_SDK_URL = process.env.IZIPAY_SDK_URL

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY

// Keycloak SSO Configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET
const KEYCLOAK_CALLBACK_URL = process.env.KEYCLOAK_CALLBACK_URL || `${BACKEND_URL}/app/login`

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    ...(DEPLOYMENT_TYPE === 'local' ? {
      databaseDriverOptions: {
        ssl: false,
        sslmode: 'disable',
      },
    } : {}),
    redisUrl: REDIS_URL,
    http: {
      storeCors: STORE_CORS,
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET,
      // Configure auth methods per actor type
      // Keycloak is enabled for both admin users and customers
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
    ...(CACHE_REDIS_URL ? [{
      key: Modules.CACHING,
      resolve: '@medusajs/medusa/caching',
      options: {
        providers: [
          {
            resolve: '@medusajs/caching-redis',
            id: 'caching-redis',
            // Optional, makes this the default caching provider
            is_default: true,
            options: {
              redisUrl: CACHE_REDIS_URL,
            },
          },
        ],
      },
    }] : []),
    {
      key: Modules.EVENT_BUS,
      resolve: "./src/modules/event-bus-rabbitmq",
      options: {
        url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@172.17.0.1:5672',
        exchange: "tourism-exchange",
      },
    },
    ...(WE_REDIS_URL ? [{
      key: Modules.WORKFLOW_ENGINE,
      resolve: '@medusajs/medusa/workflow-engine-redis',
      options: {
        redis: {
          url: WE_REDIS_URL,
        },
      },
    }] : []),
    ...(LOCKING_REDIS_URL ? [{
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
    // Payment Module with providers
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
    {
      resolve: './src/modules/tour-booking',
    },
    {
      resolve: './src/modules/package',
    },
    // Auth Module with providers (emailpass + Keycloak if configured)
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          // Default emailpass provider (always included)
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          // Keycloak provider (only if configured)
          {
            resolve: "./src/modules/keycloak-auth",
            id: "keycloak-admin",
            options: {
              keycloakUrl: process.env.KEYCLOAK_URL,
              realm: process.env.KEYCLOAK_REALM,
              clientId: process.env.KEYCLOAK_CLIENT_ID,
              clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
              callbackUrl: `${process.env.BACKEND_URL}/auth/user/keycloak-admin/callback`,
              scope: "openid profile email",

            },
          },
          {
            resolve: "./src/modules/keycloak-auth-store",
            id: "keycloak-store",
            options: {
              keycloakUrl: process.env.KEYCLOAK_URL,
              realm: process.env.KEYCLOAK_REALM,
              clientId: process.env.KEYCLOAK_STORE_CLIENT_ID,
              clientSecret: process.env.KEYCLOAK_STORE_CLIENT_SECRET,
              callbackUrl: `${process.env.BACKEND_URL}/auth/customer/keycloak-store/callback`,
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
