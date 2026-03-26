import type { Request, Response } from 'express'

import speakeasy from 'speakeasy'
import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import { emailService } from '../../common/services/email.service'
import {
  compareScryptHash,
  hashStringSha256,
  hashWithScrypt,
} from '../../common/utils/crypto'
import { createEmailOtp, verifyEmailOtp } from '../../common/utils/otp'
import {
  clearUserRefreshCookie,
  clearUserSessionCookie,
  generateUserRefreshToken,
  signAccessToken,
  signTempToken,
  verifyTempToken,
  verifyUserRefreshToken,
} from '../../common/utils/token'
import { config } from '../../config'
import { authConstants } from './constants'
import { EmailOtpModel } from './emailOtp.model'
import type {
  AccountAccessibleUserState,
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetTokenResponse,
  SanitizedUser,
  SentResponse,
  SocialProfile,
  SuccessResponse,
  UpdateMePayload,
  UserLoginHistoryItem,
  UserLoginResult,
  UserNotificationPreferences,
  UserTwoFactorChallengePayload,
  UserWithTokensResult,
} from './interface'
import {
  UserEmailVerificationTokenModel,
  UserLoginHistoryModel,
  UserModel,
} from './model'
import {
  assertResendOtpWindow,
  buildQrCodeUrl,
  buildUserJwtPayload,
  createAndStoreToken,
  encryptTwoFactorSecret,
  generateBackupCodes,
  hashBackupCodes,
  issueUserAccessToken,
  pendingUserBackupCodes,
  recordUserLogin,
  sanitizeUser,
  verifyUserTotp,
} from './utils'

const assertUserAccountAccessible = (user: AccountAccessibleUserState) => {
  if (!user.isActive || user.isSuspended || user.deletedAt) {
    throw new AppError('Account is inactive or suspended.', 403)
  }
}

const register = async (
  payload: RegisterPayload,
): Promise<UserWithTokensResult> => {
  const existingUser = await UserModel.findOne({ email: payload.email })

  if (existingUser) {
    throw new AppError('A user with this email already exists.', 409)
  }

  const passwordHash = await hashWithScrypt(payload.password)

  const user = await UserModel.create({
    firstName: payload.firstName,
    ...(payload.lastName ? { lastName: payload.lastName } : {}),
    email: payload.email,
    countryCode: payload.countryCode.toUpperCase(),
    passwordHash,
    provider: 'local',
    isEmailVerified: false,
  })

  const verificationToken = await createAndStoreToken(
    user._id.toString(),
    UserEmailVerificationTokenModel,
    authConstants.verificationTokenTtlMinutes,
  )

  await emailService.sendEmail({
    to: user.email,
    subject: 'Verify your LMS account',
    text: `Use this verification token: ${verificationToken}`,
  })

  return {
    user: sanitizeUser(user),
    tokens: issueUserAccessToken(user),
  }
}

const login = async (
  payload: LoginPayload,
  request?: Request,
): Promise<UserLoginResult> => {
  const user = await UserModel.findOne({ email: payload.email })

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password.', 401)
  }

  assertUserAccountAccessible(user)

  const isPasswordValid = await compareScryptHash(
    payload.password,
    user.passwordHash,
  )

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401)
  }

  user.lastLoginAt = new Date()
  await user.save()
  await recordUserLogin(user._id.toString(), request)

  await auditService.logEvent({
    actor: {
      id: user._id.toString(),
      type: 'system',
      email: user.email,
    },
    action: 'user.login',
    module: 'auth',
    targetId: user._id.toString(),
    targetType: 'user',
    description: 'User logged in successfully.',
    ...(request?.id ? { requestId: request.id } : {}),
  })

  if (user.twoFactor.enabled) {
    if (!user.twoFactor.secret) {
      throw new AppError('2FA is enabled but not configured correctly.', 500)
    }

    const tempTokenExpiry =
      config.jwt.tempTokenExpiresIn === '5m' ? '5m' : ('5m' as const)

    const tempToken = signTempToken(
      {
        id: user._id.toString(),
        email: user.email,
        actorType: 'user',
        pending2FA: true,
      },
      config.jwt.userSecret,
      tempTokenExpiry,
    )

    return {
      requiresTwoFactor: true,
      tempToken,
    }
  }

  const tokens = issueUserAccessToken(user)

  return {
    requiresTwoFactor: false,
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  }
}

const enableTwoFactor = async (userId: string) => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  const generatedSecret = speakeasy.generateSecret({
    name: `${config.oauth.twoFactorIssuer}:${user.email}`,
    length: 20,
  })

  if (!generatedSecret.base32 || !generatedSecret.otpauth_url) {
    throw new AppError('Failed to generate 2FA secret.', 500)
  }

  const backupCodes = generateBackupCodes()

  user.twoFactor.secret = encryptTwoFactorSecret(generatedSecret.base32)
  user.twoFactor.backupCodes = undefined
  user.twoFactor.enabled = false
  user.twoFactor.verifiedAt = undefined
  await user.save()

  pendingUserBackupCodes.set(user._id.toString(), backupCodes)

  return {
    secret: generatedSecret.base32,
    qrCodeUrl: buildQrCodeUrl(generatedSecret.otpauth_url),
    backupCodes,
  }
}

const verifyTwoFactor = async (userId: string, otp: string) => {
  const user = await UserModel.findById(userId)
  const pendingBackupCodes = pendingUserBackupCodes.get(userId)

  if (!user || !user.twoFactor.secret) {
    throw new AppError('2FA setup not found for this user.', 404)
  }

  if (!pendingBackupCodes || pendingBackupCodes.length === 0) {
    throw new AppError(
      '2FA setup session expired. Please generate a new 2FA setup.',
      400,
    )
  }

  const isOtpValid = verifyUserTotp(user.twoFactor.secret, otp)

  if (!isOtpValid) {
    throw new AppError('Invalid OTP code.', 401)
  }

  user.twoFactor.enabled = true
  user.twoFactor.backupCodes = hashBackupCodes(pendingBackupCodes)
  user.twoFactor.verifiedAt = new Date()
  await user.save()
  pendingUserBackupCodes.delete(userId)

  return { success: true }
}

const disableTwoFactor = async (userId: string, otp: string) => {
  const user = await UserModel.findById(userId)

  if (!user || !user.twoFactor.enabled || !user.twoFactor.secret) {
    throw new AppError('2FA is not enabled for this user.', 400)
  }

  const isOtpValid = verifyUserTotp(user.twoFactor.secret, otp)

  if (!isOtpValid) {
    throw new AppError('Invalid OTP code.', 401)
  }

  user.twoFactor.enabled = false
  user.twoFactor.secret = undefined
  user.twoFactor.backupCodes = undefined
  user.twoFactor.verifiedAt = undefined
  await user.save()
  pendingUserBackupCodes.delete(userId)

  return { success: true }
}

const challengeTwoFactor = async (payload: UserTwoFactorChallengePayload) => {
  const decoded = verifyTempToken(payload.tempToken, config.jwt.userSecret)

  if (decoded.actorType !== 'user' || !decoded.pending2FA) {
    throw new AppError('Invalid user 2FA challenge token.', 401)
  }

  const user = await UserModel.findById(decoded.id)

  if (
    !user ||
    user.email !== decoded.email ||
    !user.twoFactor.enabled ||
    !user.twoFactor.secret
  ) {
    throw new AppError('User 2FA challenge is invalid.', 401)
  }

  const isOtpValid = payload.emailOtp
    ? await verifyEmailOtp(
        user._id.toString(),
        'user',
        'login',
        payload.emailOtp,
      )
    : payload.otp
      ? verifyUserTotp(user.twoFactor.secret, payload.otp)
      : false

  if (!isOtpValid) {
    throw new AppError('Invalid OTP code.', 401)
  }

  user.twoFactor.verifiedAt = new Date()
  user.lastLoginAt = new Date()
  await user.save()

  const tokenPayload = buildUserJwtPayload(user)

  return {
    accessToken: signAccessToken(
      tokenPayload,
      config.jwt.userSecret,
      config.jwt.accessExpiresIn,
    ),
    refreshToken: generateUserRefreshToken(tokenPayload),
    user: sanitizeUser(user),
  }
}

const sendUserEmailOtp = async (tempToken: string) => {
  const decoded = verifyTempToken(tempToken, config.jwt.userSecret)

  if (decoded.actorType !== 'user' || !decoded.pending2FA) {
    throw new AppError('Invalid user 2FA challenge token.', 401)
  }

  const user = await UserModel.findById(decoded.id)

  if (!user || user.email !== decoded.email || !user.twoFactor.enabled) {
    throw new AppError('User 2FA challenge is invalid.', 401)
  }

  const otp = await createEmailOtp(user._id.toString(), 'user', 'login')

  await emailService.sendEmail({
    to: user.email,
    subject: 'Your Stackread login code',
    text: `Your login code is: ${otp}`,
  })

  return { sent: true }
}

const getBackupCodesCount = async (userId: string, otp: string) => {
  const user = await UserModel.findById(userId)

  if (!user || !user.twoFactor.enabled || !user.twoFactor.secret) {
    throw new AppError('2FA is not enabled for this user.', 400)
  }

  const isOtpValid = verifyUserTotp(user.twoFactor.secret, otp)

  if (!isOtpValid) {
    throw new AppError('Invalid OTP code.', 401)
  }

  return {
    remainingBackupCodes: user.twoFactor.backupCodes?.length ?? 0,
  }
}

const socialLogin = async (
  profile: SocialProfile,
  request?: Request,
): Promise<UserWithTokensResult> => {
  const nameParts = (profile.name ?? '').trim().split(/\s+/)
  const firstName = nameParts[0] ?? profile.name
  const lastName = nameParts.slice(1).join(' ') || undefined

  let user = await UserModel.findOne({
    $or: [
      { email: profile.email },
      { provider: profile.provider, socialProviderId: profile.providerId },
    ],
  })

  if (!user) {
    user = await UserModel.create({
      firstName,
      ...(lastName ? { lastName } : {}),
      email: profile.email,
      provider: profile.provider,
      socialProviderId: profile.providerId,
      isEmailVerified: true,
    })
  } else {
    user.firstName = firstName
    user.lastName = lastName
    user.provider = profile.provider
    user.socialProviderId = profile.providerId
    user.isEmailVerified = true
    user.lastLoginAt = new Date()
    await user.save()
  }

  await recordUserLogin(user._id.toString(), request)

  return {
    user: sanitizeUser(user),
    tokens: issueUserAccessToken(user),
  }
}

const getMe = async (userId: string): Promise<SanitizedUser> => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  return sanitizeUser(user)
}

const getMyLoginHistory = async (
  userId: string,
): Promise<UserLoginHistoryItem[]> => {
  const rows = await UserLoginHistoryModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)

  return rows.map((row) => {
    const ipAddress = row.ipAddress
    const userAgent = row.userAgent

    return {
      id: row._id.toString(),
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
      createdAt: row.createdAt.toISOString(),
    }
  })
}

const updateMe = async (
  userId: string,
  payload: UpdateMePayload,
): Promise<SanitizedUser> => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  if (payload.firstName) {
    user.firstName = payload.firstName
  }

  if (typeof payload.lastName !== 'undefined') {
    user.lastName = payload.lastName || undefined
  }

  if (typeof payload.phone !== 'undefined') {
    user.phone = payload.phone || undefined
  }

  if (typeof payload.profilePicture !== 'undefined') {
    user.profilePicture = payload.profilePicture || undefined
  }

  if (payload.countryCode) {
    user.countryCode = payload.countryCode.toUpperCase()
  }

  if (payload.notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...payload.notificationPreferences,
    }
  }

  await user.save()
  return sanitizeUser(user)
}

const updateNotificationPreferences = async (
  userId: string,
  payload: Partial<UserNotificationPreferences>,
): Promise<SanitizedUser> => {
  return authService.updateMe(userId, { notificationPreferences: payload })
}

const changePassword = async (
  userId: string,
  payload: ChangePasswordPayload,
): Promise<void> => {
  const user = await UserModel.findById(userId)

  if (!user || !user.passwordHash) {
    throw new AppError('User not found.', 404)
  }

  const isPasswordValid = await compareScryptHash(
    payload.currentPassword,
    user.passwordHash,
  )

  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect.', 401)
  }

  user.passwordHash = await hashWithScrypt(payload.newPassword)
  await user.save()
}

const verifyEmail = async (token: string): Promise<void> => {
  const tokenHash = hashStringSha256(token)
  const tokenDoc = await UserEmailVerificationTokenModel.findOne({
    tokenHash,
  })

  if (!tokenDoc || tokenDoc.expiresAt.getTime() < Date.now()) {
    throw new AppError('Email verification token is invalid or expired.', 400)
  }

  const user = await UserModel.findById(tokenDoc.userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  user.isEmailVerified = true
  await user.save()
  await UserEmailVerificationTokenModel.deleteMany({ userId: user._id })
}

const resendVerification = async (email: string): Promise<void> => {
  const user = await UserModel.findOne({ email })

  if (!user) {
    return
  }

  const verificationToken = await createAndStoreToken(
    user._id.toString(),
    UserEmailVerificationTokenModel,
    authConstants.verificationTokenTtlMinutes,
  )

  await emailService.sendEmail({
    to: user.email,
    subject: 'Verify your LMS account',
    text: `Use this verification token: ${verificationToken}`,
  })
}

const forgotPassword = async (email: string): Promise<SentResponse> => {
  const user = await UserModel.findOne({ email })

  if (!user) {
    return { sent: true }
  }

  if (!user.isActive || user.isSuspended || user.deletedAt) {
    return { sent: true }
  }

  await assertResendOtpWindow(user._id.toString(), 'user')

  const otp = await createEmailOtp(
    user._id.toString(),
    'user',
    'password-reset',
  )

  await emailService.sendEmail({
    to: user.email,
    subject: 'Stackread password reset code',
    text: `Your password reset code is: ${otp}`,
  })

  return { sent: true }
}

const resendResetOtp = async (email: string): Promise<SentResponse> => {
  const user = await UserModel.findOne({ email })

  if (!user) {
    return { sent: true }
  }

  await assertResendOtpWindow(user._id.toString(), 'user')

  await EmailOtpModel.deleteMany({
    actorId: user._id,
    actorType: 'user',
    purpose: 'password-reset',
    usedAt: null,
  })

  const otp = await createEmailOtp(
    user._id.toString(),
    'user',
    'password-reset',
  )

  await emailService.sendEmail({
    to: user.email,
    subject: 'Stackread password reset code',
    text: `Your password reset code is: ${otp}`,
  })

  return { sent: true }
}

const verifyResetOtp = async (
  email: string,
  otp: string,
): Promise<ResetTokenResponse> => {
  const user = await UserModel.findOne({ email })

  if (!user) {
    throw new AppError('Invalid or expired code', 400)
  }

  const isValid = await verifyEmailOtp(
    user._id.toString(),
    'user',
    'password-reset',
    otp,
  )

  if (!isValid) {
    throw new AppError('Invalid or expired code', 400)
  }

  const resetToken = signTempToken(
    {
      id: user._id.toString(),
      email: user.email,
      actorType: 'user',
      purpose: 'password-reset',
    },
    config.jwt.userSecret,
    '10m',
  )

  return { resetToken }
}

const resetPassword = async (
  resetToken: string,
  newPassword: string,
): Promise<SuccessResponse> => {
  const decoded = verifyTempToken(resetToken, config.jwt.userSecret)

  if (decoded.actorType !== 'user' || decoded.purpose !== 'password-reset') {
    throw new AppError('Invalid password reset token', 400)
  }

  const user = await UserModel.findById(decoded.id)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  assertUserAccountAccessible(user)

  user.passwordHash = await hashWithScrypt(newPassword)
  await user.save()

  await EmailOtpModel.deleteMany({
    actorId: user._id,
    actorType: 'user',
    purpose: 'password-reset',
  })

  return { success: true }
}

const refreshSession = async (refreshToken: string): Promise<AuthTokens> => {
  const payload = verifyUserRefreshToken(refreshToken)
  const userId = payload.id ?? payload.sub

  if (!userId) {
    throw new AppError('Unauthorized. Invalid refresh token.', 401)
  }

  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('Unauthorized. Invalid refresh token.', 401)
  }

  assertUserAccountAccessible(user)

  return issueUserAccessToken(user)
}

const logout = async (response: Response): Promise<void> => {
  clearUserSessionCookie(response)
  clearUserRefreshCookie(response)
}

export const authService = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,
  refreshSession,
  logout,
  getMe,
  getMyLoginHistory,
  updateMe,
  getBackupCodesCount,
  sendUserEmailOtp,
  socialLogin,
  changePassword,
  updateNotificationPreferences,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  challengeTwoFactor,
}
