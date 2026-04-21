import crypto from 'node:crypto'

import type { Request, RequestHandler } from 'express'
import QRCode from 'qrcode'
import speakeasy from 'speakeasy'
import { AppError } from '../../common/errors/AppError'
import {
  generateRandomToken,
  hashStringSha256,
} from '../../common/utils/crypto'
import {
  generateUserRefreshToken,
  signAccessToken,
  type AccessTokenPayload,
} from '../../common/utils/token'
import { config } from '../../config'
import type { BaseJwtPayload } from '../../types/express'
import { EmailOtpModel } from './emailOtp.model'
import type { AuthTokens, IUser, SanitizedUser } from './interface'
import { UserLoginHistoryModel } from './model'

const deriveTwoFactorEncryptionKey = (): Buffer => {
  return crypto
    .createHash('sha256')
    .update(config.jwt.userSecret)
    .digest()
    .subarray(0, 32)
}

export const ensureGoogleConfigured = (): void => {
  if (
    !config.oauth.googleClientId ||
    !config.oauth.googleClientSecret ||
    !config.oauth.googleCallbackUrl
  ) {
    throw new AppError('Google authentication is not configured.', 503)
  }
}

export const ensureFacebookConfigured = (): void => {
  if (
    !config.oauth.facebookAppId ||
    !config.oauth.facebookAppSecret ||
    !config.oauth.facebookCallbackUrl
  ) {
    throw new AppError('Facebook authentication is not configured.', 503)
  }
}

export const ensureAuthenticatedUser = (
  request: Parameters<RequestHandler>[0],
): string => {
  const userId = request.auth?.sub

  if (!userId || request.auth?.type !== 'user') {
    throw new AppError('Unauthorized user access.', 401)
  }

  return userId
}

export const encryptTwoFactorSecret = (secret: string): string => {
  const iv = crypto.randomBytes(12)
  const key = deriveTwoFactorEncryptionKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export const decryptTwoFactorSecret = (encryptedSecret: string): string => {
  const [ivHex, authTagHex, cipherHex] = encryptedSecret.split(':')

  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error('Invalid encrypted 2FA secret format.')
  }

  const key = deriveTwoFactorEncryptionKey()
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex'),
  )

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

export const generateBackupCodes = (count = 8): string[] => {
  return Array.from({ length: count }, () => {
    return crypto.randomInt(10000000, 99999999).toString()
  })
}

export const hashBackupCodes = (backupCodes: string[]): string[] => {
  return backupCodes.map((code) => hashStringSha256(code))
}

export const buildUserJwtPayload = (
  user: IUser,
): BaseJwtPayload & AccessTokenPayload => {
  return {
    id: user._id.toString(),
    sub: user._id.toString(),
    actorType: 'user',
    type: 'user',
    sessionVersion: user.sessionVersion,
    email: user.email,
    role: 'user',
    permissions: [],
  }
}

export const sanitizeUser = (user: IUser): SanitizedUser => {
  const lastLoginAt = user.lastLoginAt?.toISOString()
  const address = user.address
  const countryCode = user.countryCode
  const lastName = user.lastName
  const phone = user.phone
  const profilePicture = user.profilePicture

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    ...(lastName ? { lastName } : {}),
    email: user.email,
    ...(address ? { address } : {}),
    ...(countryCode ? { countryCode } : {}),
    ...(phone ? { phone } : {}),
    ...(profilePicture ? { profilePicture } : {}),
    provider: user.provider,
    isEmailVerified: user.isEmailVerified,
    isSuspended: user.isSuspended,
    twoFactorEnabled: user.twoFactor.enabled,
    notificationPreferences: user.notificationPreferences,
    ...(lastLoginAt ? { lastLoginAt } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

const computeExpiryDate = (minutes: number): Date => {
  return new Date(Date.now() + minutes * 60 * 1000)
}

export const createAndStoreToken = async (
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

const normalizeHeaderValue = (
  request: Request | undefined,
  headerName: string,
): string | undefined => {
  const value = request?.header(headerName)
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const resolveLocationFromRequest = (
  request: Request | undefined,
): string | undefined => {
  const city =
    normalizeHeaderValue(request, 'x-vercel-ip-city') ??
    normalizeHeaderValue(request, 'cf-ipcity') ??
    normalizeHeaderValue(request, 'x-city')

  const region =
    normalizeHeaderValue(request, 'x-vercel-ip-country-region') ??
    normalizeHeaderValue(request, 'x-vercel-ip-region') ??
    normalizeHeaderValue(request, 'cf-region') ??
    normalizeHeaderValue(request, 'x-region')

  const countryName = normalizeHeaderValue(request, 'x-vercel-ip-country-name')
  const countryCode =
    normalizeHeaderValue(request, 'x-vercel-ip-country') ??
    normalizeHeaderValue(request, 'cf-ipcountry') ??
    normalizeHeaderValue(request, 'x-country-code') ??
    normalizeHeaderValue(request, 'x-appengine-country')

  const country = countryName ?? countryCode
  const locationParts = [city, region, country].filter(
    (value): value is string => Boolean(value),
  )

  if (locationParts.length === 0) {
    return undefined
  }

  const uniqueLocationParts = locationParts.filter((part, index) => {
    return (
      locationParts.findIndex(
        (candidate) => candidate.toLowerCase() === part.toLowerCase(),
      ) === index
    )
  })

  return uniqueLocationParts.join(', ')
}

const resolveBrowserFromUserAgent = (
  userAgent: string | undefined,
): string | undefined => {
  if (!userAgent) {
    return undefined
  }

  const normalized = userAgent.toLowerCase()

  if (normalized.includes('edg/')) {
    return 'Edge'
  }

  if (normalized.includes('opr/') || normalized.includes('opera')) {
    return 'Opera'
  }

  if (normalized.includes('chrome/')) {
    return 'Chrome'
  }

  if (normalized.includes('firefox/')) {
    return 'Firefox'
  }

  if (normalized.includes('safari/') && !normalized.includes('chrome/')) {
    return 'Safari'
  }

  if (normalized.includes('trident/') || normalized.includes('msie')) {
    return 'Internet Explorer'
  }

  return undefined
}

const resolveDeviceFromUserAgent = (
  userAgent: string | undefined,
): string | undefined => {
  if (!userAgent) {
    return undefined
  }

  const normalized = userAgent.toLowerCase()

  if (normalized.includes('iphone')) {
    return 'iPhone'
  }

  if (normalized.includes('ipad')) {
    return 'iPad'
  }

  if (normalized.includes('android')) {
    return normalized.includes('mobile') ? 'Android Phone' : 'Android Tablet'
  }

  if (normalized.includes('macintosh') || normalized.includes('mac os')) {
    return 'Mac'
  }

  if (normalized.includes('windows')) {
    return 'Windows PC'
  }

  if (normalized.includes('linux')) {
    return 'Linux'
  }

  return undefined
}

export const recordUserLogin = async (
  userId: string,
  request?: Request,
): Promise<void> => {
  const userAgent = normalizeHeaderValue(request, 'user-agent')

  await UserLoginHistoryModel.create({
    userId,
    ipAddress: request?.ip,
    ...(userAgent ? { userAgent } : {}),
    ...(resolveBrowserFromUserAgent(userAgent)
      ? { browser: resolveBrowserFromUserAgent(userAgent) }
      : {}),
    ...(resolveDeviceFromUserAgent(userAgent)
      ? { device: resolveDeviceFromUserAgent(userAgent) }
      : {}),
    ...(resolveLocationFromRequest(request)
      ? { location: resolveLocationFromRequest(request) }
      : {}),
  })
}

export const issueUserAccessToken = (
  user: IUser,
  rememberMe?: boolean,
): AuthTokens => {
  const tokenPayload = buildUserJwtPayload(user)

  return {
    accessToken: signAccessToken(
      tokenPayload,
      config.jwt.userSecret,
      rememberMe ? config.jwt.refreshExpiresIn : config.jwt.accessExpiresIn,
    ),
    refreshToken: generateUserRefreshToken(tokenPayload),
  }
}

export const assertResendOtpWindow = async (
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

export const verifyUserTotp = (
  encryptedSecret: string,
  token: string,
): boolean => {
  const base32Secret = decryptTwoFactorSecret(encryptedSecret)

  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token,
    window: 1,
  })
}

export const buildQrCodeUrl = async (otpAuthUrl: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(otpAuthUrl, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  } catch {
    return `https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`
  }
}

export const pendingUserBackupCodes = new Map<string, string[]>()
