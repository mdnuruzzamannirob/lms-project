import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Application } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import './config/env' // Validate env vars first
import env from './config/env'
import passport from './config/passport'
import errorHandler from './middleware/error-handler'
import authRoutes from './modules/auth/auth.routes'
import onboardingRoutes from './modules/onboarding/onboarding.routes'

const app: Application = express()

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ─── Passport ────────────────────────────────────────────────────────────────
app.use(passport.initialize())

// ─── Routes ───────────────────────────────────────────────────────────────────
const BASE = '/api/v1'

app.get(`${BASE}/health`, (_req, res) => {
  res.json({
    success: true,
    message: 'API is running.',
    timestamp: new Date().toISOString(),
  })
})

app.use(`${BASE}/auth`, authRoutes)
app.use(`${BASE}/onboarding`, onboardingRoutes)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Cannot ${req.method} ${req.path}` })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler)

export default app
