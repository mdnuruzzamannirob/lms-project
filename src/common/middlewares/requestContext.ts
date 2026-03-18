import type { RequestHandler } from 'express'
import { nanoid } from 'nanoid'

export const requestContext: RequestHandler = (request, response, next) => {
  request.id = request.header('x-request-id')?.trim() || nanoid()
  response.locals.responseTimeMs = '0.00'
  response.setHeader('x-request-id', request.id)
  next()
}
