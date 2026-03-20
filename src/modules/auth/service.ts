import type { Request, Response } from 'express'
import speakeasy from 'speakeasy'

import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import { emailService } from '../../common/services/email.service'
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
  AuthTokens,
  IUser,
  LoginPayload,
  RegisterPayload,
  SanitizedUser,
  SocialProfile,
  UserNotificationPreferences,
} from './interface'
import {
  UserEmailVerificationTokenModel,
  UserLoginHistoryModel,
  UserModel,
} from './model'
import {
  buildUserJwtPayload,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateBackupCodes,
  hashBackupCodes,
  sanitizeUser,
} from './utils'

const computeExpiryDate = (minutes: number): Date => {
  return new Date(Date.now() + minutes * 60 * 1000)
}

const createAndStoreToken = async (
  userId: string,
  model: {
    deleteMany(filter: Record<string, unknown>): Promise<unknown>
    create(payload: {
      userId: string
      tokenHash: string
      expiresAt: Date
    }): Promise<unknown>
  },
  ttlMinutes: number,
): Promise<string> => {
  const rawToken = generateRandomToken(24)
  const tokenHash = hashStringSha256(rawToken)

  await model.deleteMany({ userId })
  await model.create({
    userId,
    tokenHash,
    expiresAt: computeExpiryDate(ttlMinutes),
  })

  return rawToken
}

const recordUserLogin = async (
  userId: string,
  request?: Request,
): Promise<void> => {
  await UserLoginHistoryModel.create({
    userId,
    ipAddress: request?.ip,
    userAgent: request?.header('user-agent'),
  })
}

const issueUserAccessToken = (user: IUser): AuthTokens => {
  const tokenPayload = buildUserJwtPayload(user)

  return {
    accessToken: signAccessToken(
      tokenPayload,
      config.jwt.userSecret,
      config.jwt.accessExpiresIn,
    ),
    refreshToken: generateUserRefreshToken(tokenPayload),
  }
}

const assertResendOtpWindow = async (
  actorId: string,
  actorType: 'user' | 'staff',
): Promise<void> => {
  const latestOtp = await EmailOtpModel.findOne({
    actorId,
    actorType,
    purpose: 'password-reset',
  })
    .sort({ _id: -1 })
    .lean()

  if (!latestOtp) {
    return
  }

  const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime()

  if (elapsedMs < 60_000) {
    throw new AppError('Please wait before requesting a new code', 429)
  }
}

const verifyUserTotp = (encryptedSecret: string, token: string): boolean => {
  const base32Secret = decryptTwoFactorSecret(encryptedSecret)

  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token,
    window: 1,
  })
}

const buildQrCodeUrl = (otpauthUrl: string): string => {
  return `https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`
}

const pendingUserBackupCodes = new Map<string, string[]>()

export const authService = {
  register: async (
    payload: RegisterPayload,
  ): Promise<{
    user: SanitizedUser
    tokens: AuthTokens
  }> => {
    const existingUser = await UserModel.findOne({ email: payload.email })

    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409)
    }

    const passwordHash = await hashWithScrypt(payload.password)

    const user = await UserModel.create({
      name: payload.name,
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
  },

  login: async (
    payload: LoginPayload,
    request?: Request,
  ): Promise<
    | {
        requiresTwoFactor: false
        accessToken: string
        refreshToken: string
        user: SanitizedUser
      }
    | {
        requiresTwoFactor: true
        tempToken: string
      }
  > => {
    const user = await UserModel.findOne({ email: payload.email })

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password.', 401)
    }

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
  },

  enableTwoFactor: async (userId: string) => {
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
  },

  verifyTwoFactor: async (userId: string, otp: string) => {
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
  },

  disableTwoFactor: async (userId: string, otp: string) => {
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
  },

  challengeTwoFactor: async (payload: {
    tempToken: string
    otp?: string
    emailOtp?: string
  }) => {
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
  },

  sendUserEmailOtp: async (tempToken: string) => {
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
  },

  getBackupCodesCount: async (userId: string, otp: string) => {
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
  },

  socialLogin: async (
    profile: SocialProfile,
    request?: Request,
  ): Promise<{ user: SanitizedUser; tokens: AuthTokens }> => {
    let user = await UserModel.findOne({
      $or: [
        { email: profile.email },
        { provider: profile.provider, socialProviderId: profile.providerId },
      ],
    })

    if (!user) {
      user = await UserModel.create({
        name: profile.name,
        email: profile.email,
        provider: profile.provider,
        socialProviderId: profile.providerId,
        isEmailVerified: true,
      })
    } else {
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
  },

  getMe: async (userId: string): Promise<SanitizedUser> => {
    const user = await UserModel.findById(userId)

    if (!user) {
      throw new AppError('User not found.', 404)
    }

    return sanitizeUser(user)
  },

  getMyLoginHistory: async (
    userId: string,
  ): Promise<
    Array<{
      id: string
      ipAddress?: string
      userAgent?: string
      createdAt: string
    }>
  > => {
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
  },

  updateMe: async (
    userId: string,
    payload: {
      name?: string
      countryCode?: string
      notificationPreferences?: Partial<UserNotificationPreferences>
    },
  ): Promise<SanitizedUser> => {
    const user = await UserModel.findById(userId)

    if (!user) {
      throw new AppError('User not found.', 404)
    }

    if (payload.name) {
      user.name = payload.name
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
  },

  updateNotificationPreferences: async (
    userId: string,
    payload: Partial<UserNotificationPreferences>,
  ): Promise<SanitizedUser> => {
    return authService.updateMe(userId, { notificationPreferences: payload })
  },

  changePassword: async (
    userId: string,
    payload: { currentPassword: string; newPassword: string },
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
  },

  verifyEmail: async (token: string): Promise<void> => {
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
  },

  resendVerification: async (email: string): Promise<void> => {
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
  },

  forgotPassword: async (email: string): Promise<{ sent: true }> => {
    const user = await UserModel.findOne({ email })

    if (!user) {
      return { sent: true }
    }

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
  },

  resendResetOtp: async (email: string): Promise<{ sent: true }> => {
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
  },

  verifyResetOtp: async (
    email: string,
    otp: string,
  ): Promise<{ resetToken: string }> => {
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
  },

  resetPassword: async (
    resetToken: string,
    newPassword: string,
  ): Promise<{ success: true }> => {
    const decoded = verifyTempToken(resetToken, config.jwt.userSecret)

    if (decoded.actorType !== 'user' || decoded.purpose !== 'password-reset') {
      throw new AppError('Invalid password reset token', 400)
    }

    const user = await UserModel.findById(decoded.id)

    if (!user) {
      throw new AppError('User not found.', 404)
    }

    user.passwordHash = await hashWithScrypt(newPassword)
    await user.save()

    await EmailOtpModel.deleteMany({
      actorId: user._id,
      actorType: 'user',
      purpose: 'password-reset',
    })

    return { success: true }
  },

  refreshSession: async (refreshToken: string): Promise<AuthTokens> => {
    const payload = verifyUserRefreshToken(refreshToken)
    const userId = payload.id ?? payload.sub

    if (!userId) {
      throw new AppError('Unauthorized. Invalid refresh token.', 401)
    }

    const user = await UserModel.findById(userId)

    if (!user) {
      throw new AppError('Unauthorized. Invalid refresh token.', 401)
    }

    return issueUserAccessToken(user)
  },

  logout: async (response: Response): Promise<void> => {
    clearUserSessionCookie(response)
    clearUserRefreshCookie(response)
  },
}
