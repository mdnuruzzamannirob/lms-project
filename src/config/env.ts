import dotenv from 'dotenv'
dotenv.config()

const required = ['MONGODB_URI', 'JWT_SECRET']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`,
  )
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT ?? '5000', 10),

  MONGODB_URI: process.env.MONGODB_URI as string,

  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT ?? '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Digital Library',
  EMAIL_FROM_ADDRESS:
    process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || '',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',

  EMAIL_VERIFY_EXPIRES_HOURS: 24,
  PASSWORD_RESET_EXPIRES_HOURS: 1,
  STAFF_INVITE_EXPIRES_HOURS: 48,
} as const

export default env
