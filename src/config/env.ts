import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  API_VERSION: z.string().trim().min(1).default('v1'),

  // Database
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),

  // HTTP
  CORS_ORIGINS: z.string().trim().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  LOG_DIR: z.string().trim().min(1).default('logs'),
  LOG_ROTATE_MAX_SIZE: z.string().trim().default('20m'),
  LOG_ROTATE_APP_MAX_FILES: z.string().trim().default('14d'),
  LOG_ROTATE_ERROR_MAX_FILES: z.string().trim().default('30d'),
  LOG_ZIPPED_ARCHIVE: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true'
      }
      return value
    }, z.boolean())
    .default(true),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  SEARCH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(180),
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  REPORT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(80),

  // JWT
  JWT_USER_SECRET: z.string().trim().min(1, 'JWT_USER_SECRET is required'),
  JWT_STAFF_SECRET: z.string().trim().min(1, 'JWT_STAFF_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().default('30d'),
  TEMP_TOKEN_EXPIRES_IN: z.string().trim().default('5m'),
  STAFF_SETUP_TOKEN_EXPIRES_IN: z.string().trim().default('10m'),
  JWT_ISSUER: z.string().trim().default('lms-backend'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(20).default(12),
  SESSION_SECRET: z
    .string()
    .trim()
    .min(1)
    .default('change-this-session-secret'),

  // OAuth + 2FA
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_CALLBACK_URL: z.string().trim().optional(),
  FACEBOOK_APP_ID: z.string().trim().optional(),
  FACEBOOK_APP_SECRET: z.string().trim().optional(),
  FACEBOOK_CALLBACK_URL: z.string().trim().optional(),
  TWO_FACTOR_ISSUER: z.string().trim().default('LMS-Staff'),

  // Email (Gmail SMTP)
  GMAIL_USER: z.string().trim().optional(),
  GMAIL_APP_PASSWORD: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().default('noreply@example.com'),

  // Push (Firebase)
  FIREBASE_PROJECT_ID: z.string().trim().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().trim().optional(),
  FIREBASE_PRIVATE_KEY: z.string().trim().optional(),

  // Storage (Cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),

  // Payments (all active)
  SSLCOMMERZ_STORE_ID: z.string().trim().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().trim().optional(),
  SSLCOMMERZ_IS_LIVE: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true'
      }
      return value
    }, z.boolean())
    .default(false),
  PAYPAL_CLIENT_ID: z.string().trim().optional(),
  PAYPAL_CLIENT_SECRET: z.string().trim().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_WEBHOOK_ID: z.string().trim().optional(),
  STRIPE_SECRET_KEY: z.string().trim().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().optional(),

  // URLs
  FRONTEND_URL: z.string().trim().default('http://localhost:3000'),
  BACKEND_URL: z.string().trim().default('http://localhost:5000'),
  STAFF_PORTAL_URL: z.string().trim().default('http://localhost:3001'),

  // Bootstrap/seed
  SUPER_ADMIN_NAME: z.string().trim().default('Super Admin'),
  SUPER_ADMIN_EMAIL: z.string().trim().email().default('admin@example.com'),
  SUPER_ADMIN_PASSWORD: z
    .string()
    .trim()
    .min(8)
    .default('change-this-password'),

  // Workers
  WORKER_ENABLED: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true'
      }
      return value
    }, z.boolean())
    .default(true),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  JOB_RETRY_LIMIT: z.coerce.number().int().positive().default(3),
  JOB_RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(500),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),

  // Domain defaults
  REPORT_DOWNLOAD_TTL_DAYS: z.coerce.number().int().positive().default(7),
  DEFAULT_TIMEZONE: z.string().trim().default('Asia/Dhaka'),
  DEFAULT_CURRENCY: z.string().trim().min(3).max(3).default('BDT'),
  DEFAULT_LANGUAGE: z.string().trim().default('en'),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ')

  throw new Error(`Environment validation failed: ${issues}`)
}

const rawEnv = parsedEnv.data

if (rawEnv.NODE_ENV === 'production') {
  const productionChecks: Array<{ ok: boolean; message: string }> = [
    {
      ok: rawEnv.JWT_USER_SECRET.length >= 16,
      message: 'JWT_USER_SECRET must be at least 16 characters in production.',
    },
    {
      ok: rawEnv.JWT_STAFF_SECRET.length >= 16,
      message: 'JWT_STAFF_SECRET must be at least 16 characters in production.',
    },
    {
      ok: rawEnv.CORS_ORIGINS !== '*',
      message: 'CORS_ORIGINS cannot be wildcard in production.',
    },
    {
      ok: rawEnv.SUPER_ADMIN_PASSWORD !== 'change-this-password',
      message:
        'SUPER_ADMIN_PASSWORD must be changed from default value in production.',
    },
  ]

  productionChecks.push(
    {
      ok: Boolean(rawEnv.GMAIL_USER),
      message: 'GMAIL_USER is required in production.',
    },
    {
      ok: Boolean(rawEnv.GMAIL_APP_PASSWORD),
      message: 'GMAIL_APP_PASSWORD is required in production.',
    },
    {
      ok: Boolean(rawEnv.FIREBASE_PROJECT_ID),
      message: 'FIREBASE_PROJECT_ID is required in production.',
    },
    {
      ok: Boolean(rawEnv.FIREBASE_CLIENT_EMAIL),
      message: 'FIREBASE_CLIENT_EMAIL is required in production.',
    },
    {
      ok: Boolean(rawEnv.FIREBASE_PRIVATE_KEY),
      message: 'FIREBASE_PRIVATE_KEY is required in production.',
    },
    {
      ok: Boolean(rawEnv.CLOUDINARY_CLOUD_NAME),
      message: 'CLOUDINARY_CLOUD_NAME is required in production.',
    },
    {
      ok: Boolean(rawEnv.CLOUDINARY_API_KEY),
      message: 'CLOUDINARY_API_KEY is required in production.',
    },
    {
      ok: Boolean(rawEnv.CLOUDINARY_API_SECRET),
      message: 'CLOUDINARY_API_SECRET is required in production.',
    },
    {
      ok: Boolean(rawEnv.SSLCOMMERZ_STORE_ID),
      message: 'SSLCOMMERZ_STORE_ID is required in production.',
    },
    {
      ok: Boolean(rawEnv.SSLCOMMERZ_STORE_PASSWORD),
      message: 'SSLCOMMERZ_STORE_PASSWORD is required in production.',
    },
    {
      ok: Boolean(rawEnv.STRIPE_SECRET_KEY),
      message: 'STRIPE_SECRET_KEY is required in production.',
    },
    {
      ok: Boolean(rawEnv.STRIPE_WEBHOOK_SECRET),
      message: 'STRIPE_WEBHOOK_SECRET is required in production.',
    },
    {
      ok: Boolean(rawEnv.PAYPAL_CLIENT_ID),
      message: 'PAYPAL_CLIENT_ID is required in production.',
    },
    {
      ok: Boolean(rawEnv.PAYPAL_CLIENT_SECRET),
      message: 'PAYPAL_CLIENT_SECRET is required in production.',
    },
  )

  const failedChecks = productionChecks.filter((check) => !check.ok)
  if (failedChecks.length > 0) {
    throw new Error(
      `Production environment validation failed: ${failedChecks
        .map((check) => check.message)
        .join(' ')}`,
    )
  }
}

export const env = {
  nodeEnv: rawEnv.NODE_ENV,
  isDevelopment: rawEnv.NODE_ENV === 'development',
  isProduction: rawEnv.NODE_ENV === 'production',
  port: rawEnv.PORT,
  apiVersion: rawEnv.API_VERSION,
  apiPrefix: `/api/${rawEnv.API_VERSION}`,
  mongodbUri: rawEnv.MONGODB_URI,
  corsOrigins: rawEnv.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  logLevel: rawEnv.LOG_LEVEL,
  logDir: rawEnv.LOG_DIR,
  logRotation: {
    maxSize: rawEnv.LOG_ROTATE_MAX_SIZE,
    appMaxFiles: rawEnv.LOG_ROTATE_APP_MAX_FILES,
    errorMaxFiles: rawEnv.LOG_ROTATE_ERROR_MAX_FILES,
    zippedArchive: rawEnv.LOG_ZIPPED_ARCHIVE,
  },
  rateLimitWindowMs: rawEnv.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: rawEnv.RATE_LIMIT_MAX,
  rateLimitByGroup: {
    auth: rawEnv.AUTH_RATE_LIMIT_MAX,
    admin: rawEnv.ADMIN_RATE_LIMIT_MAX,
    search: rawEnv.SEARCH_RATE_LIMIT_MAX,
    webhook: rawEnv.WEBHOOK_RATE_LIMIT_MAX,
    reports: rawEnv.REPORT_RATE_LIMIT_MAX,
  },
  jwt: {
    userSecret: rawEnv.JWT_USER_SECRET,
    staffSecret: rawEnv.JWT_STAFF_SECRET,
    accessExpiresIn: rawEnv.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: rawEnv.JWT_REFRESH_EXPIRES_IN,
    tempTokenExpiresIn: rawEnv.TEMP_TOKEN_EXPIRES_IN,
    staffSetupTokenExpiresIn: rawEnv.STAFF_SETUP_TOKEN_EXPIRES_IN,
    issuer: rawEnv.JWT_ISSUER,
    scryptCost: rawEnv.BCRYPT_SALT_ROUNDS,
    sessionSecret: rawEnv.SESSION_SECRET,
  },
  oauth: {
    googleClientId: rawEnv.GOOGLE_CLIENT_ID,
    googleClientSecret: rawEnv.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: rawEnv.GOOGLE_CALLBACK_URL,
    facebookAppId: rawEnv.FACEBOOK_APP_ID,
    facebookAppSecret: rawEnv.FACEBOOK_APP_SECRET,
    facebookCallbackUrl: rawEnv.FACEBOOK_CALLBACK_URL,
    twoFactorIssuer: rawEnv.TWO_FACTOR_ISSUER,
  },
  providers: {
    gmailUser: rawEnv.GMAIL_USER,
    gmailAppPassword: rawEnv.GMAIL_APP_PASSWORD,
    emailFrom: rawEnv.EMAIL_FROM,
    firebaseProjectId: rawEnv.FIREBASE_PROJECT_ID,
    firebaseClientEmail: rawEnv.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: rawEnv.FIREBASE_PRIVATE_KEY,
    cloudinaryCloudName: rawEnv.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: rawEnv.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: rawEnv.CLOUDINARY_API_SECRET,
    sslCommerzStoreId: rawEnv.SSLCOMMERZ_STORE_ID,
    sslCommerzStorePassword: rawEnv.SSLCOMMERZ_STORE_PASSWORD,
    sslCommerzIsLive: rawEnv.SSLCOMMERZ_IS_LIVE,
    paypalClientId: rawEnv.PAYPAL_CLIENT_ID,
    paypalClientSecret: rawEnv.PAYPAL_CLIENT_SECRET,
    paypalMode: rawEnv.PAYPAL_MODE,
    paypalWebhookId: rawEnv.PAYPAL_WEBHOOK_ID,
    stripeSecretKey: rawEnv.STRIPE_SECRET_KEY,
    stripeWebhookSecret: rawEnv.STRIPE_WEBHOOK_SECRET,
  },
  frontendUrl: rawEnv.FRONTEND_URL,
  backendUrl: rawEnv.BACKEND_URL,
  staffPortalUrl: rawEnv.STAFF_PORTAL_URL,
  superAdmin: {
    name: rawEnv.SUPER_ADMIN_NAME,
    email: rawEnv.SUPER_ADMIN_EMAIL,
    password: rawEnv.SUPER_ADMIN_PASSWORD,
  },
  worker: {
    enabled: rawEnv.WORKER_ENABLED,
    pollIntervalMs: rawEnv.WORKER_POLL_INTERVAL_MS,
    jobRetryLimit: rawEnv.JOB_RETRY_LIMIT,
    jobRetryBackoffMs: rawEnv.JOB_RETRY_BACKOFF_MS,
    shutdownTimeoutMs: rawEnv.SHUTDOWN_TIMEOUT_MS,
  },
  reportDownloadTtlDays: rawEnv.REPORT_DOWNLOAD_TTL_DAYS,
  defaults: {
    timezone: rawEnv.DEFAULT_TIMEZONE,
    currency: rawEnv.DEFAULT_CURRENCY,
    language: rawEnv.DEFAULT_LANGUAGE,
  },
} as const

export type Env = typeof env
