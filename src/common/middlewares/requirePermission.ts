import type { RequestHandler } from 'express'

import { AppError } from '../errors/AppError'

export const requirePermission =
  (...permissions: string[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth || request.auth.type !== 'staff') {
      next(new AppError('Forbidden. Staff authentication is required.', 403))
      return
    }

    const staffPermissions = request.auth.permissions ?? []
    const hasPermission = permissions.every((permission) =>
      staffPermissions.includes(permission),
    )

    if (!hasPermission) {
      next(
        new AppError(
          `Forbidden. Missing required permission(s): ${permissions.join(', ')}`,
          403,
        ),
      )
      return
    }

    next()
  }
