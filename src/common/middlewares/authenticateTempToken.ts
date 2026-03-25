import type { RequestHandler } from 'express'

import { config } from '../../config'
import { AppError } from '../errors/AppError'
import { verifyTempToken } from '../utils/token'

export const authenticateTempToken: RequestHandler = (
  request,
  _response,
  next,
) => {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Temporary authentication token is required.', 401)
    }

    const tempToken = authHeader.slice(7)
    const decoded = verifyTempToken(tempToken, config.jwt.staffSecret)

    request.auth = {
      id: decoded.id,
      sub: decoded.id,
      type: 'staff-temp',
      email: decoded.email,
      actorType: 'staff',
    } as any

    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Invalid or expired temporary token.', 401),
    )
  }
}
