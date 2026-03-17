import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import env from '../config/env'
import { IUser } from '../models/user.model'

export interface JwtUserPayload {
  id: string
  type: 'user'
  tv: number
}

export const generateUserJWT = (user: IUser): string =>
  jwt.sign(
    {
      id: user._id.toString(),
      type: 'user',
      tv: user.token_version,
    } as JwtUserPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  )

export const generateCryptoToken = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex')

export const hashToken = (plain: string): string =>
  crypto.createHash('sha256').update(plain).digest('hex')

export const hoursFromNow = (hours: number): Date =>
  new Date(Date.now() + hours * 60 * 60 * 1000)

export const parseDeviceType = (
  userAgent = '',
): 'desktop' | 'mobile' | 'tablet' | 'unknown' => {
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad/.test(ua))
    return /ipad/.test(ua) ? 'tablet' : 'mobile'
  if (/windows|macintosh|linux/.test(ua)) return 'desktop'
  return 'unknown'
}
