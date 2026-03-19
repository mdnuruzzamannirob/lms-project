import crypto from 'node:crypto'

import { hashStringSha256 } from '../../common/utils/crypto'
import type { AccessTokenPayload } from '../../common/utils/token'
import { config } from '../../config'
import type { BaseJwtPayload } from '../../types/express'
import type { IUser, SanitizedUser } from './interface'

const deriveTwoFactorEncryptionKey = (): Buffer => {
  return crypto
    .createHash('sha256')
    .update(config.jwt.userSecret)
    .digest()
    .subarray(0, 32)
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
    twoFactorEnabled: user.twoFactor.enabled,
    notificationPreferences: user.notificationPreferences,
    ...(lastLoginAt ? { lastLoginAt } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
