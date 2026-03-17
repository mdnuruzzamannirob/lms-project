import type { ZodTypeAny } from 'zod'

export type AuthActorType = 'user' | 'staff'

export interface BaseJwtPayload {
  sub: string
  type: AuthActorType
  email?: string
  role?: string
  permissions?: string[]
  iat?: number
  exp?: number
  iss?: string
}

declare global {
  namespace Express {
    interface Request {
      id: string
      validated?: {
        body?: unknown
        query?: unknown
        params?: unknown
      }
      auth?: BaseJwtPayload
      rawBody?: Buffer
    }

    interface Locals {
      responseTimeMs?: string
    }
  }
}

export type RequestSchemas = {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
}

export {}
