import type { RequestHandler } from 'express'
import mongoSanitize from 'express-mongo-sanitize'

type SanitizableKey = 'body' | 'params' | 'headers' | 'query'

const SANITIZABLE_KEYS: SanitizableKey[] = [
  'body',
  'params',
  'headers',
  'query',
]

export const mongoSanitizeSafe: RequestHandler = (request, _response, next) => {
  for (const key of SANITIZABLE_KEYS) {
    const target = request[key] as unknown

    if (target && typeof target === 'object') {
      mongoSanitize.sanitize(target as Record<string, unknown>)
    }
  }

  next()
}
