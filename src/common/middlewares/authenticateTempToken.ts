import type { RequestHandler } from 'express'

import { AppError } from '../errors/AppError'
import { verifyTempToken } from '../utils/token'
import { config } from '../../config'

export const authenticateTempToken: RequestHandler = (
  request,
  _response,
  next,
) => {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Temporary authentication token is required.', 401)
  }

  const tempToken = authHeader.slice(7)

  try {
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
    throw new AppError('Invalid or expired temporary token.', 401)
  }
}
