import type { Types } from 'mongoose'

export type UserAuthProvider = 'local' | 'google' | 'facebook'

export type UserNotificationPreferences = {
  email: boolean
  push: boolean
}

export type UserTwoFactor = {
  enabled: boolean
  secret: string | undefined
  backupCodes: string[] | undefined
  verifiedAt: Date | undefined
}

export interface IUser {
  _id: Types.ObjectId
  firstName: string
  lastName: string | undefined
  email: string
  countryCode?: string
  phone: string | undefined
  profilePicture: string | undefined
  passwordHash?: string
  provider: UserAuthProvider
  socialProviderId?: string
  isEmailVerified: boolean
  isActive: boolean
  isSuspended: boolean
  suspendedAt: Date | undefined
  suspensionReason: string | undefined
  deletedAt: Date | undefined
  notificationPreferences: UserNotificationPreferences
  twoFactor: UserTwoFactor
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type RegisterPayload = {
  firstName: string
  lastName?: string
  email: string
  password: string
  countryCode: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type SanitizedUser = {
  id: string
  firstName: string
  lastName?: string
  email: string
  countryCode?: string
  phone?: string
  profilePicture?: string
  provider: UserAuthProvider
  isEmailVerified: boolean
  isSuspended: boolean
  twoFactorEnabled: boolean
  notificationPreferences: UserNotificationPreferences
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export type TempTokenPayload = {
  id: string
  email: string
  actorType: 'user' | 'staff'
  pending2FA?: boolean
  mustSetup2FA?: boolean
}

export type SocialProfile = {
  provider: 'google' | 'facebook'
  providerId: string
  email: string
  name: string
}

export type EmailOtpActorType = 'user' | 'staff'

export type EmailOtpPurpose =
  | 'login'
  | '2fa-verify'
  | '2fa-setup'
  | 'password-reset'

export interface EmailOtpDocument {
  actorId: Types.ObjectId
  actorType: EmailOtpActorType
  otpHash: string
  purpose: EmailOtpPurpose
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UserEmailVerificationToken {
  userId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
}

export interface UserLoginHistory {
  userId: Types.ObjectId
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}
