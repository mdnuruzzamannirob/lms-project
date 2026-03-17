import type { RequestHandler } from 'express'

import { AppError } from '../errors/AppError'
import { extractBearerToken, verifyAccessToken } from '../utils/token'

const resolveTokenFromRequest = (authorizationHeader?: string): string => {
  const token = extractBearerToken(authorizationHeader)

  if (!token) {
    throw new AppError('Unauthorized. Bearer token is required.', 401)
  }

  return token
}

export const authenticateUser: RequestHandler = (request, _response, next) => {
  try {
    const token = resolveTokenFromRequest(request.header('authorization'))
    const payload = verifyAccessToken(token, 'user')
    request.auth = payload
    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Unauthorized. Invalid or expired user token.', 401),
    )
  }
}

export const authenticateStaff: RequestHandler = (request, _response, next) => {
  try {
    const token = resolveTokenFromRequest(request.header('authorization'))
    const payload = verifyAccessToken(token, 'staff')
    request.auth = payload
    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Unauthorized. Invalid or expired staff token.', 401),
    )
  }
}

export const optionalAuth: RequestHandler = (request, _response, next) => {
  try {
    const token = extractBearerToken(request.header('authorization'))

    if (!token) {
      next()
      return
    }

    try {
      request.auth = verifyAccessToken(token, 'user')
      next()
      return
    } catch {
      request.auth = verifyAccessToken(token, 'staff')
      next()
      return
    }
  } catch {
    next()
  }
}
