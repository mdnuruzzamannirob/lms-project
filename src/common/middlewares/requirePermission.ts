import type { RequestHandler } from 'express'

import type { PermissionKey } from '../constants/permissions'
import { AppError } from '../errors/AppError'

export const requirePermission = (
  ...permissions: PermissionKey[]
): RequestHandler => {
  return (request, _response, next) => {
    if (!request.auth || request.auth.type !== 'staff') {
      next(new AppError('Forbidden. Staff authentication is required.', 403))
      return
    }

    if (request.auth.isSuperAdmin === true) {
      next()
      return
    }

    const staffPermissions = request.auth.permissions ?? []

    if (staffPermissions.includes('*')) {
      next()
      return
    }

    const hasPermission = permissions.some((permission) =>
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
}
