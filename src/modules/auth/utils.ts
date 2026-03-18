import type { BaseJwtPayload } from '../../types/express'
import type { IUser, SanitizedUser } from './interface'

export const buildUserJwtPayload = (user: IUser): BaseJwtPayload => {
  return {
    sub: user._id.toString(),
    type: 'user',
    email: user.email,
    role: 'user',
    permissions: [],
  }
}

export const sanitizeUser = (user: IUser): SanitizedUser => {
  const lastLoginAt = user.lastLoginAt?.toISOString()
  const countryCode = user.countryCode

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    ...(countryCode ? { countryCode } : {}),
    provider: user.provider,
    isEmailVerified: user.isEmailVerified,
    notificationPreferences: user.notificationPreferences,
    ...(lastLoginAt ? { lastLoginAt } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
