import type { Types } from 'mongoose'

export type UserAuthProvider = 'local' | 'google' | 'facebook'

export type UserNotificationPreferences = {
  email: boolean
  push: boolean
}

export interface IUser {
  _id: Types.ObjectId
  name: string
  email: string
  countryCode?: string
  passwordHash?: string
  provider: UserAuthProvider
  socialProviderId?: string
  isEmailVerified: boolean
  notificationPreferences: UserNotificationPreferences
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type RegisterPayload = {
  name: string
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
}

export type SanitizedUser = {
  id: string
  name: string
  email: string
  countryCode?: string
  provider: UserAuthProvider
  isEmailVerified: boolean
  notificationPreferences: UserNotificationPreferences
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export type SocialProfile = {
  provider: 'google' | 'facebook'
  providerId: string
  email: string
  name: string
}
