import type { Request, Response } from 'express'

import speakeasy from 'speakeasy'
import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import { emailService } from '../../common/services/email.service'
import { storageService } from '../../common/services/storage.service'
import {
  compareScryptHash,
  generateRandomToken,
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
  DeleteMyAccountPayload,
  IUser,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  ResetTokenResponse,
  SanitizedUser,
  SentResponse,
  SocialProfile,
  SuccessResponse,
  UpdateMePayload,
  UpdateProfilePicturePayload,
  UserLoginHistoryPage,
  UserLoginHistoryItem,
  UserLoginResult,
  UserNotificationPreferences,
  UserTwoFactorChallengePayload,
  VerifyTwoFactorPayload,
} from './interface'
import {
  UserEmailVerificationTokenModel,
  UserEphemeralTokenModel,
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

const assertUserCurrentPassword = async (
  user: Pick<IUser, 'passwordHash'>,
  currentPassword: string,
): Promise<void> => {
  if (!user.passwordHash) {
    throw new AppError(
      'Set a password first before managing 2FA settings.',
      400,
    )
  }

  const isPasswordValid = await compareScryptHash(
    currentPassword,
    user.passwordHash,
  )

  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect.', 401)
  }
}

const MAX_PROFILE_PICTURE_BYTES = 512 * 1024

const parseBase64Upload = (value: string): {
  buffer: Buffer
  contentType: string
  defaultFileName: string
} => {
  const trimmed = value.trim()
  const dataUrlMatch = trimmed.match(/^data:([^;,]+);base64,(.+)$/)

  const contentType = dataUrlMatch?.[1]?.trim() || 'application/octet-stream'
  const encoded = dataUrlMatch?.[2] ?? trimmed
  const buffer = Buffer.from(encoded, 'base64')

  if (!buffer.length) {
    throw new AppError('Invalid base64 file payload.', 400)
  }

  const extensionByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }

  return {
    buffer,
    contentType,
    defaultFileName: `profile-picture.${extensionByMime[contentType] ?? 'bin'}`,
  }
}

const getLockoutTime = (): Date => {
  return new Date(Date.now() + authConstants.lockoutMinutes * 60 * 1000)
}

const getEphemeralTokenExpiry = (ttlMinutes: number): Date => {
  return new Date(Date.now() + ttlMinutes * 60 * 1000)
}

const issueSingleUseTempToken = async (
  userId: string,
  email: string,
  purpose: 'password-reset' | 'two-factor-challenge',
  ttlMinutes: number,
) => {
  const rawTokenId = generateRandomToken(16)
  const tokenIdHash = hashStringSha256(rawTokenId)

  await UserEphemeralTokenModel.create({
    userId,
    tokenHash: tokenIdHash,
    purpose,
    expiresAt: getEphemeralTokenExpiry(ttlMinutes),
  })

  const token = signTempToken(
    {
      id: userId,
      email,
      actorType: 'user',
      tokenId: rawTokenId,
      purpose,
      ...(purpose === 'two-factor-challenge' ? { pending2FA: true } : {}),
    },
    config.jwt.userSecret,
    ttlMinutes <= 5 ? '5m' : '10m',
  )

  return token
}

const consumeSingleUseTempToken = async (
  userId: string,
  tokenId: string | undefined,
  purpose: 'password-reset' | 'two-factor-challenge',
): Promise<void> => {
  if (!tokenId) {
    throw new AppError('Invalid temporary token.', 401)
  }

  const tokenHash = hashStringSha256(tokenId)
  const tokenDoc = await UserEphemeralTokenModel.findOne({
    userId,
    tokenHash,
    purpose,
    usedAt: { $exists: false },
  })

  if (!tokenDoc || tokenDoc.expiresAt.getTime() < Date.now()) {
    throw new AppError('Temporary token is invalid or expired.', 401)
  }

  tokenDoc.usedAt = new Date()
  await tokenDoc.save()
}

const register = async (payload: RegisterPayload): Promise<RegisterResult> => {
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
    requiresEmailVerification: true,
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

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    throw new AppError(
      'Account temporarily locked due to too many failed login attempts.',
      429,
    )
  }

  const isPasswordValid = await compareScryptHash(
    payload.password,
    user.passwordHash,
  )

  if (!isPasswordValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1

    if (user.failedLoginAttempts >= authConstants.loginMaxAttempts) {
      user.lockoutUntil = getLockoutTime()
      user.failedLoginAttempts = 0
    }

    await user.save()
    throw new AppError('Invalid email or password.', 401)
  }

  if (!user.isEmailVerified) {
    throw new AppError('Email verification is required before login.', 403)
  }

  user.failedLoginAttempts = 0
  user.lockoutUntil = undefined

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

    const tempToken = await issueSingleUseTempToken(
      user._id.toString(),
      user.email,
      'two-factor-challenge',
      authConstants.twoFactorChallengeTokenTtlMinutes,
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

const enableTwoFactor = async (
  userId: string,
  payload: { currentPassword: string },
) => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  await assertUserCurrentPassword(user, payload.currentPassword)

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
    qrCodeUrl: await buildQrCodeUrl(generatedSecret.otpauth_url),
    backupCodes,
  }
}

const verifyTwoFactor = async (
  userId: string,
  payload: VerifyTwoFactorPayload,
) => {
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

  await assertUserCurrentPassword(user, payload.currentPassword)

  const isOtpValid = payload.emailOtp
    ? await verifyEmailOtp(
        user._id.toString(),
        'user',
        '2fa-setup',
        payload.emailOtp,
      )
    : payload.otp
      ? verifyUserTotp(user.twoFactor.secret, payload.otp)
      : false

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

const sendUserSetupEmailOtp = async (userId: string) => {
  const user = await UserModel.findById(userId)

  if (!user || !user.twoFactor.secret || user.twoFactor.enabled) {
    throw new AppError('2FA setup not found for this user.', 404)
  }

  const otp = await createEmailOtp(user._id.toString(), 'user', '2fa-setup')

  await emailService.sendEmail({
    to: user.email,
    subject: 'Your Stackread 2FA setup code',
    text: `Your 2FA setup code is: ${otp}`,
  })

  return { sent: true }
}

const disableTwoFactor = async (
  userId: string,
  payload: { otp?: string; currentPassword: string },
) => {
  const user = await UserModel.findById(userId)

  if (!user || !user.twoFactor.enabled || !user.twoFactor.secret) {
    throw new AppError('2FA is not enabled for this user.', 400)
  }

  await assertUserCurrentPassword(user, payload.currentPassword)

  if (payload.otp && !verifyUserTotp(user.twoFactor.secret, payload.otp)) {
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

  if (
    decoded.actorType !== 'user' ||
    !decoded.pending2FA ||
    decoded.purpose !== 'two-factor-challenge'
  ) {
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

  await consumeSingleUseTempToken(
    user._id.toString(),
    decoded.tokenId,
    'two-factor-challenge',
  )

  let backupCodeUsed = false
  if (payload.backupCode) {
    const hashedInput = hashStringSha256(payload.backupCode)
    const codeIndex =
      user.twoFactor.backupCodes?.findIndex((code) => code === hashedInput) ??
      -1

    if (codeIndex >= 0) {
      user.twoFactor.backupCodes?.splice(codeIndex, 1)
      backupCodeUsed = true
    }
  }

  const isOtpValid = backupCodeUsed
    ? true
    : payload.emailOtp
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

  if (
    decoded.actorType !== 'user' ||
    !decoded.pending2FA ||
    decoded.purpose !== 'two-factor-challenge'
  ) {
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

const regenerateBackupCodes = async (
  userId: string,
  payload: { otp?: string; currentPassword: string },
) => {
  const user = await UserModel.findById(userId)

  if (!user || !user.twoFactor.enabled || !user.twoFactor.secret) {
    throw new AppError('2FA is not enabled for this user.', 400)
  }

  await assertUserCurrentPassword(user, payload.currentPassword)

  if (payload.otp && !verifyUserTotp(user.twoFactor.secret, payload.otp)) {
    throw new AppError('Invalid OTP code.', 401)
  }

  const backupCodes = generateBackupCodes()
  user.twoFactor.backupCodes = hashBackupCodes(backupCodes)
  await user.save()

  return {
    backupCodes,
  }
}

const socialLogin = async (
  profile: SocialProfile,
  request?: Request,
): Promise<UserLoginResult> => {
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
    assertUserAccountAccessible(user)

    user.firstName = firstName
    user.lastName = lastName

    if (
      user.provider !== profile.provider ||
      user.socialProviderId !== profile.providerId
    ) {
      user.socialProviderId = profile.providerId
    }

    user.isEmailVerified = true
    user.lastLoginAt = new Date()
    await user.save()
  }

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    throw new AppError(
      'Account temporarily locked due to too many failed login attempts.',
      429,
    )
  }

  user.failedLoginAttempts = 0
  user.lockoutUntil = undefined
  await user.save()

  await recordUserLogin(user._id.toString(), request)

  if (user.twoFactor.enabled) {
    if (!user.twoFactor.secret) {
      throw new AppError('2FA is enabled but not configured correctly.', 500)
    }

    const tempToken = await issueSingleUseTempToken(
      user._id.toString(),
      user.email,
      'two-factor-challenge',
      authConstants.twoFactorChallengeTokenTtlMinutes,
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

const getMe = async (userId: string): Promise<SanitizedUser> => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  return sanitizeUser(user)
}

const getMyLoginHistory = async (
  userId: string,
  pagination?: {
    page?: number
    limit?: number
  },
): Promise<UserLoginHistoryPage> => {
  const requestedPage =
    typeof pagination?.page === 'number' && Number.isInteger(pagination.page)
      ? pagination.page
      : 1
  const requestedLimit =
    typeof pagination?.limit === 'number' &&
    Number.isInteger(pagination.limit)
      ? pagination.limit
      : authConstants.loginHistoryDefaultLimit
  const safePage = Math.max(requestedPage, 1)
  const safeLimit = Math.min(
    Math.max(requestedLimit, 1),
    authConstants.loginHistoryMaxLimit,
  )

  const total = await UserLoginHistoryModel.countDocuments({ userId })
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const boundedPage = Math.min(safePage, totalPages)
  const skip = (boundedPage - 1) * safeLimit

  const rows = await UserLoginHistoryModel.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit)

  const items: UserLoginHistoryItem[] = rows.map((row, index) => {
    const ipAddress = row.ipAddress
    const userAgent = row.userAgent
    const browser = row.browser
    const device = row.device
    const location = row.location

    return {
      id: row._id.toString(),
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
      ...(browser ? { browser } : {}),
      ...(device ? { device } : {}),
      ...(location ? { location } : {}),
      status: boundedPage === 1 && index === 0 ? 'current' : 'successful',
      createdAt: row.createdAt.toISOString(),
    }
  })

  return {
    items,
    pagination: {
      page: boundedPage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: boundedPage < totalPages,
      hasPreviousPage: boundedPage > 1,
    },
  }
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

  if (typeof payload.email !== 'undefined') {
    const normalizedEmail = payload.email.trim().toLowerCase()

    if (normalizedEmail !== user.email) {
      const existingUser = await UserModel.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      }).select('_id')

      if (existingUser) {
        throw new AppError('A user with this email already exists.', 409)
      }

      user.email = normalizedEmail
    }
  }

  if (typeof payload.phone !== 'undefined') {
    user.phone = payload.phone || undefined
  }

  if (typeof payload.profilePicture !== 'undefined') {
    user.profilePicture = payload.profilePicture || undefined
  }

  if (typeof payload.address !== 'undefined') {
    user.address = payload.address || undefined
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

const deleteMyAccount = async (
  userId: string,
  payload: DeleteMyAccountPayload,
): Promise<SuccessResponse> => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  if (user.passwordHash) {
    if (!payload.currentPassword) {
      throw new AppError(
        'Current password is required to delete your account.',
        400,
      )
    }

    const isPasswordValid = await compareScryptHash(
      payload.currentPassword,
      user.passwordHash,
    )

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect.', 401)
    }
  }

  user.isActive = false
  user.deletedAt = new Date()
  user.sessionVersion = (user.sessionVersion ?? 1) + 1
  user.twoFactor.enabled = false
  user.twoFactor.secret = undefined
  user.twoFactor.backupCodes = undefined
  user.twoFactor.verifiedAt = undefined

  await user.save()
  pendingUserBackupCodes.delete(userId)

  await auditService.logEvent({
    actor: {
      id: user._id.toString(),
      type: 'system',
      email: user.email,
    },
    action: 'user.delete-self',
    module: 'auth',
    targetId: user._id.toString(),
    targetType: 'user',
    description: 'User deleted their own account.',
  })

  return { success: true }
}

const updateNotificationPreferences = async (
  userId: string,
  payload: Partial<UserNotificationPreferences>,
): Promise<SanitizedUser> => {
  return authService.updateMe(userId, { notificationPreferences: payload })
}

const updateProfilePicture = async (
  userId: string,
  payload: UpdateProfilePicturePayload,
): Promise<SanitizedUser> => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  if (typeof payload.fileBase64 === 'string' && payload.fileBase64.trim()) {
    const uploadPayload = parseBase64Upload(payload.fileBase64)

    if (!uploadPayload.contentType.startsWith('image/')) {
      throw new AppError('Profile picture must be an image.', 400)
    }

    if (uploadPayload.buffer.byteLength > MAX_PROFILE_PICTURE_BYTES) {
      throw new AppError(
        'Profile picture is too large. Maximum allowed size is 512KB.',
        400,
      )
    }

    const uploaded = await storageService.uploadFile({
      fileName:
        payload.fileName?.trim() ||
        uploadPayload.defaultFileName ||
        'profile-picture.bin',
      contentType: uploadPayload.contentType,
      buffer: uploadPayload.buffer,
      folder: `users/${userId}/profile-picture`,
    })

    user.profilePicture = uploaded.url
  } else {
    user.profilePicture = payload.profilePicture?.trim() || undefined
  }

  await user.save()

  return sanitizeUser(user)
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
  user.sessionVersion = (user.sessionVersion ?? 1) + 1
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

  if (!user.isEmailVerified) {
    user.isEmailVerified = true
    await user.save()
  }

  if (!tokenDoc.usedAt) {
    tokenDoc.usedAt = new Date()
    await tokenDoc.save()
  }

  await UserEmailVerificationTokenModel.deleteMany({
    userId: user._id,
    tokenHash: { $ne: tokenHash },
  })
}

const resendVerification = async (email: string): Promise<void> => {
  const user = await UserModel.findOne({ email })

  if (!user || user.isEmailVerified) {
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

  const resetToken = await issueSingleUseTempToken(
    user._id.toString(),
    user.email,
    'password-reset',
    authConstants.resetTokenTtlMinutes,
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

  await consumeSingleUseTempToken(decoded.id, decoded.tokenId, 'password-reset')

  const user = await UserModel.findById(decoded.id)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  assertUserAccountAccessible(user)

  user.passwordHash = await hashWithScrypt(newPassword)
  user.sessionVersion = (user.sessionVersion ?? 1) + 1
  await user.save()

  await EmailOtpModel.deleteMany({
    actorId: user._id,
    actorType: 'user',
    purpose: 'password-reset',
  })

  await UserEphemeralTokenModel.deleteMany({
    userId: user._id,
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

  if (
    typeof payload.sessionVersion === 'number' &&
    payload.sessionVersion !== user.sessionVersion
  ) {
    throw new AppError('Unauthorized. Session has expired.', 401)
  }

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
  regenerateBackupCodes,
  sendUserEmailOtp,
  sendUserSetupEmailOtp,
  socialLogin,
  changePassword,
  updateNotificationPreferences,
  updateProfilePicture,
  deleteMyAccount,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  challengeTwoFactor,
}
