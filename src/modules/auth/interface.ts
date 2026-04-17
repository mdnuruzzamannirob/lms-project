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

export type UserTempTokenPurpose = 'password-reset' | 'two-factor-challenge'

export interface IUser {
  _id: Types.ObjectId
  firstName: string
  lastName: string | undefined
  email: string
  address: string | undefined
  countryCode?: string
  phone: string | undefined
  profilePicture: string | undefined
  passwordHash?: string
  provider: UserAuthProvider
  socialProviderId?: string
  stripeCustomerId?: string
  isEmailVerified: boolean
  isActive: boolean
  isSuspended: boolean
  failedLoginAttempts: number
  lockoutUntil: Date | undefined
  sessionVersion: number
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
  address?: string
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
  tokenId?: string
  purpose?: UserTempTokenPurpose
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
  usedAt?: Date
}

export interface UserEphemeralToken {
  userId: Types.ObjectId
  tokenHash: string
  purpose: UserTempTokenPurpose
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UserLoginHistory {
  userId: Types.ObjectId
  ipAddress?: string
  userAgent?: string
  browser?: string
  device?: string
  location?: string
  createdAt: Date
}

export interface AccountAccessibleUserState {
  isActive: boolean
  isSuspended: boolean
  deletedAt: Date | undefined
}

export interface UserTwoFactorChallengePayload {
  tempToken: string
  otp?: string
  emailOtp?: string
  backupCode?: string
}

export interface UserLoginHistoryItem {
  id: string
  ipAddress?: string
  userAgent?: string
  browser?: string
  device?: string
  location?: string
  status: 'current' | 'successful'
  createdAt: string
}

export interface UserLoginHistoryPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface UserLoginHistoryPage {
  items: UserLoginHistoryItem[]
  pagination: UserLoginHistoryPagination
}

export interface UpdateMePayload {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  profilePicture?: string
  address?: string
  countryCode?: string
  notificationPreferences?: Partial<UserNotificationPreferences>
}

export interface DeleteMyAccountPayload {
  currentPassword?: string
}

export interface UpdateProfilePicturePayload {
  profilePicture?: string
  fileBase64?: string
  fileName?: string
}

export interface VerifyTwoFactorPayload {
  currentPassword: string
  otp?: string
  emailOtp?: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface SentResponse {
  sent: true
}

export interface ResetTokenResponse {
  resetToken: string
}

export interface SuccessResponse {
  success: true
}

export interface UserLoginSuccessResult {
  requiresTwoFactor: false
  accessToken: string
  refreshToken: string
  user: SanitizedUser
}

export interface UserLoginTwoFactorRequiredResult {
  requiresTwoFactor: true
  tempToken: string
}

export type UserLoginResult =
  | UserLoginSuccessResult
  | UserLoginTwoFactorRequiredResult

export interface UserWithTokensResult {
  user: SanitizedUser
  tokens: AuthTokens
}

export interface RegisterResult {
  user: SanitizedUser
  requiresEmailVerification: true
}
