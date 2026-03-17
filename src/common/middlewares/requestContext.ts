import type { RequestHandler } from 'express'
import crypto from 'node:crypto'

export const requestContext: RequestHandler = (request, response, next) => {
  request.id = request.header('x-request-id')?.trim() || crypto.randomUUID()
  response.locals.responseTimeMs = '0.00'
  response.setHeader('x-request-id', request.id)
  next()
}
