import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  API_VERSION: z.string().trim().min(1).default('v1'),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),
  CORS_ORIGINS: z.string().trim().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),
  LOG_DIR: z.string().trim().min(1).default('logs'),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  JWT_USER_SECRET: z.string().trim().min(1, 'JWT_USER_SECRET is required'),
  JWT_STAFF_SECRET: z.string().trim().min(1, 'JWT_STAFF_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().default('1d'),
  JWT_ISSUER: z.string().trim().default('lms-backend'),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_CALLBACK_URL: z.string().trim().optional(),
  FACEBOOK_APP_ID: z.string().trim().optional(),
  FACEBOOK_APP_SECRET: z.string().trim().optional(),
  FACEBOOK_CALLBACK_URL: z.string().trim().optional(),
  TWO_FACTOR_ISSUER: z.string().trim().default('LMS-Staff'),
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  EMAIL_FROM: z.string().trim().default('noreply@example.com'),
  RESEND_API_KEY: z.string().trim().optional(),
  SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),
  TWILIO_ACCOUNT_SID: z.string().trim().optional(),
  TWILIO_AUTH_TOKEN: z.string().trim().optional(),
  TWILIO_FROM: z.string().trim().optional(),
  PUSH_PROVIDER: z.enum(['console', 'fcm']).default('console'),
  FCM_SERVER_KEY: z.string().trim().optional(),
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  LOCAL_STORAGE_PATH: z.string().trim().default('uploads'),
  LOCAL_STORAGE_BASE_URL: z
    .string()
    .trim()
    .default('http://localhost:5000/uploads'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),
  PAYMENT_PROVIDER: z
    .enum(['sslcommerz', 'stripe', 'paypal'])
    .default('sslcommerz'),
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
  FRONTEND_URL: z.string().trim().default('http://localhost:3000'),
  BACKEND_URL: z.string().trim().default('http://localhost:5000'),
  WORKER_ENABLED: z
    .preprocess((value) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true'
      }
      return value
    }, z.boolean())
    .default(true),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ')

  throw new Error(`Environment validation failed: ${issues}`)
}

const rawEnv = parsedEnv.data

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
  rateLimitWindowMs: rawEnv.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: rawEnv.RATE_LIMIT_MAX,
  jwt: {
    userSecret: rawEnv.JWT_USER_SECRET,
    staffSecret: rawEnv.JWT_STAFF_SECRET,
    accessExpiresIn: rawEnv.JWT_ACCESS_EXPIRES_IN,
    issuer: rawEnv.JWT_ISSUER,
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
    email: rawEnv.EMAIL_PROVIDER,
    emailFrom: rawEnv.EMAIL_FROM,
    resendApiKey: rawEnv.RESEND_API_KEY,
    sms: rawEnv.SMS_PROVIDER,
    twilioAccountSid: rawEnv.TWILIO_ACCOUNT_SID,
    twilioAuthToken: rawEnv.TWILIO_AUTH_TOKEN,
    twilioFrom: rawEnv.TWILIO_FROM,
    push: rawEnv.PUSH_PROVIDER,
    fcmServerKey: rawEnv.FCM_SERVER_KEY,
    storage: rawEnv.STORAGE_PROVIDER,
    localStoragePath: rawEnv.LOCAL_STORAGE_PATH,
    localStorageBaseUrl: rawEnv.LOCAL_STORAGE_BASE_URL,
    cloudinaryCloudName: rawEnv.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: rawEnv.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: rawEnv.CLOUDINARY_API_SECRET,
    payment: rawEnv.PAYMENT_PROVIDER,
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
  worker: {
    enabled: rawEnv.WORKER_ENABLED,
    pollIntervalMs: rawEnv.WORKER_POLL_INTERVAL_MS,
  },
} as const

export type Env = typeof env
