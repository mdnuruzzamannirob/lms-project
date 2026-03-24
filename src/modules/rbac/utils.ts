import {
  ALL_PERMISSIONS,
  PermissionKey,
} from '../../common/constants/permissions'
import { AppError } from '../../common/errors/AppError'

export const assertValidPermissions = (permissions: string[]): void => {
  const invalid = permissions.filter(
    (permission) => !ALL_PERMISSIONS.includes(permission as PermissionKey),
  )

  if (invalid.length > 0) {
    throw new AppError(`Invalid permissions: ${invalid.join(', ')}`, 400)
  }
}
