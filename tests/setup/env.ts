process.env.NODE_ENV = process.env.NODE_ENV ?? 'test'
process.env.PORT = process.env.PORT ?? '5050'
process.env.API_VERSION = process.env.API_VERSION ?? 'v1'
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lms-test'
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000'
process.env.JWT_USER_SECRET = process.env.JWT_USER_SECRET ?? 'test-user-secret'
process.env.JWT_STAFF_SECRET =
  process.env.JWT_STAFF_SECRET ?? 'test-staff-secret'
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '1h'
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'lms-test'
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '12'
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret'
process.env.GMAIL_USER = process.env.GMAIL_USER ?? 'test@gmail.local'
process.env.GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? 'app-pass'
process.env.EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@test.local'
process.env.FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? 'test-firebase-project'
process.env.FIREBASE_CLIENT_EMAIL =
  process.env.FIREBASE_CLIENT_EMAIL ?? 'firebase@test.local'
process.env.FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_PRIVATE_KEY ??
  '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----'
process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ?? 'test-cloud'
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? 'test-key'
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET ?? 'test-secret'
process.env.SSLCOMMERZ_STORE_ID =
  process.env.SSLCOMMERZ_STORE_ID ?? 'test-store-id'
process.env.SSLCOMMERZ_STORE_PASSWORD =
  process.env.SSLCOMMERZ_STORE_PASSWORD ?? 'test-store-pass'
process.env.SSLCOMMERZ_IS_LIVE = process.env.SSLCOMMERZ_IS_LIVE ?? 'false'
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY ?? 'sk_test_1234567890'
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_1234567890'
process.env.PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ?? 'paypal-client-id'
process.env.PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ?? 'paypal-client-secret'
process.env.PAYPAL_MODE = process.env.PAYPAL_MODE ?? 'sandbox'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5050'
process.env.STAFF_PORTAL_URL =
  process.env.STAFF_PORTAL_URL ?? 'http://localhost:3001'
process.env.REPORT_DOWNLOAD_TTL_DAYS =
  process.env.REPORT_DOWNLOAD_TTL_DAYS ?? '7'
process.env.DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE ?? 'Asia/Dhaka'
process.env.DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? 'BDT'
process.env.DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE ?? 'en'
