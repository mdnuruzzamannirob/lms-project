import cors from 'cors'
import type { Request, Response } from 'express'
import express from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import helmet from 'helmet'
import morgan from 'morgan'
import fs from 'node:fs'
import path from 'node:path'

import { globalErrorHandler } from '../common/errors/globalErrorHandler'
import { notFound } from '../common/middlewares/notFound'
import { apiRateLimiter } from '../common/middlewares/rateLimiter'
import { requestContext } from '../common/middlewares/requestContext'
import { responseTime } from '../common/middlewares/responseTime'
import { config } from '../config'
import { morganStream } from '../config/logger'
import { appRouter } from './routes'

const app = express()

morgan.token('request-id', (request: Request) => request.id)
morgan.token('response-time-ms', (_request: Request, response: Response) =>
  String(response.locals.responseTimeMs ?? '0.00'),
)

app.disable('x-powered-by')

app.use(requestContext)
app.use(responseTime)
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
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(mongoSanitize())

const uploadsRoot = path.resolve(
  process.cwd(),
  config.providers.localStoragePath,
)

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true })
}

app.use('/uploads', express.static(uploadsRoot))

app.use(config.apiPrefix, appRouter)

app.use(notFound)
app.use(globalErrorHandler)

export { app }
