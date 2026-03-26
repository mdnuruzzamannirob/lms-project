import type { Types } from 'mongoose'

export interface IStaffInviteToken {
  _id: Types.ObjectId
  email: string
  name: string
  phone?: string
  roleId: Types.ObjectId
  tokenHash: string
  invitedBy?: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IStaffActivityLog {
  _id: Types.ObjectId
  staffId: Types.ObjectId
  action: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface IStaffTwoFactorChallenge {
  _id: Types.ObjectId
  staffId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  consumedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface StaffAccountAccessibleState {
  isActive: boolean
  deletedAt?: Date
}

export interface StaffLoginPayload {
  email: string
  password: string
}

export interface StaffAcceptInvitePayload {
  token: string
  password: string
}

export interface StaffChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface StaffEnableTwoFactorPayload {
  otp: string
}

export interface StaffVerifyTwoFactorPayload {
  otp?: string
  emailOtp?: string
}

export interface StaffSentResponse {
  sent: true
}

export interface StaffResetTokenResponse {
  resetToken: string
}

export interface StaffSuccessResponse {
  success: true
}

export interface StaffRefreshTokens {
  accessToken: string
  refreshToken: string
}

export interface StaffLoginTwoFactorSetupResult {
  requiresTwoFactor: false
  mustSetup2FA: true
  tempToken: string
}

export interface StaffLoginTwoFactorChallengeResult {
  requiresTwoFactor: true
  mustSetup2FA: false
  tempToken: string
}

export type StaffLoginResult =
  | StaffLoginTwoFactorSetupResult
  | StaffLoginTwoFactorChallengeResult
