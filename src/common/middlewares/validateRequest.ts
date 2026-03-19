import type { RequestHandler } from 'express'

import { ZodError, type ZodTypeAny } from 'zod'

type SchemaMap = {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
}

export const validateRequest =
  (schemas: SchemaMap): RequestHandler =>
  (request, _response, next) => {
    try {
      const validated: Express.Request['validated'] = {}

      if (schemas.body) {
        validated.body = schemas.body.parse(request.body)
        request.body = validated.body
      }

      if (schemas.query) {
        validated.query = schemas.query.parse(request.query)
        Object.assign(
          request.query as Record<string, unknown>,
          validated.query as Record<string, unknown>,
        )
      }

      if (schemas.params) {
        validated.params = schemas.params.parse(request.params)
        request.params = validated.params as typeof request.params
      }

      request.validated = validated
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(error)
        return
      }

      next(error)
    }
  }
