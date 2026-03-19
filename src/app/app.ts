import { apiReference } from '@scalar/express-api-reference'
import cors from 'cors'
import type { Request, Response } from 'express'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'node:path'
import responseTime from 'response-time'
import { globalErrorHandler } from '../common/errors/globalErrorHandler'
import { mongoSanitizeSafe } from '../common/middlewares/mongoSanitizeSafe'
import { notFound } from '../common/middlewares/notFound'
import {
  adminRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  reportsRateLimiter,
  searchRateLimiter,
  webhookRateLimiter,
} from '../common/middlewares/rateLimiter'
import { requestContext } from '../common/middlewares/requestContext'
import { config } from '../config'
import { morganStream } from '../config/logger'
import { initializePassport } from '../config/passport'
import { appRouter } from './routes'

const app = express()

morgan.token('request-id', (request: Request) => request.id)
morgan.token('response-time-ms', (_request: Request, response: Response) =>
  String(response.locals.responseTimeMs ?? '0.00'),
)

app.disable('x-powered-by')

if (config.isDevelopment) {
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'documentation', 'OpenAPI_v1.json'))
  })

  app.use(
    '/api/docs',
    apiReference({
      spec: {
        url: '/api/docs/openapi.json',
      },
      theme: 'purple',
      layout: 'modern',
      defaultHttpClient: {
        targetKey: 'javascript',
        clientKey: 'fetch',
      },
    }),
  )
}

app.use(requestContext)
app.use(
  responseTime((request: Request, response: Response, duration: number) => {
    void request
    response.locals.responseTimeMs = duration.toFixed(2)
  }),
)
app.use(
  morgan(
    ':request-id :method :url :status :res[content-length] - :response-time-ms ms',
    {
      stream: morganStream,
    },
  ),
)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('CORS origin is not allowed'))
    },
    credentials: true,
  }),
)
app.use(helmet())
app.use(apiRateLimiter)
app.use(`${config.apiPrefix}/auth`, authRateLimiter)
app.use(`${config.apiPrefix}/staff`, authRateLimiter)
app.use(`${config.apiPrefix}/admin`, adminRateLimiter)
app.use(`${config.apiPrefix}/search`, searchRateLimiter)
app.use(`${config.apiPrefix}/admin/reports`, reportsRateLimiter)
app.use(`${config.apiPrefix}/webhooks`, webhookRateLimiter)
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      ;(req as Request).rawBody = buf
    },
  }),
)
app.use(express.urlencoded({ extended: true }))
app.use(mongoSanitizeSafe)
initializePassport(app)

app.use(config.apiPrefix, appRouter)

app.use(notFound)
app.use(globalErrorHandler)

export { app }
