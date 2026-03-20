import type { Response } from 'express'
import jwt from 'jsonwebtoken'

import { config } from '../../config'
import type { BaseJwtPayload } from '../../types/express'

type JwtActorType = 'user' | 'staff'

export type TempTokenPayload = {
  id: string
  email: string
  actorType: JwtActorType
  purpose?: 'password-reset'
  pending2FA?: boolean
  mustSetup2FA?: boolean
}

export type AccessTokenPayload = {
  id: string
  actorType: JwtActorType
  sub?: string
  type?: JwtActorType
  email?: string
  role?: string
  roleId?: string
  permissions?: string[]
}

const getSecretByActorType = (type: JwtActorType): string => {
  return type === 'user' ? config.jwt.userSecret : config.jwt.staffSecret
}

const USER_SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? 'stackread_session'
const STAFF_SESSION_COOKIE_NAME =
  process.env.STAFF_SESSION_COOKIE_NAME ?? 'stackread_staff_session'
const USER_REFRESH_COOKIE_NAME = 'stackread_refresh'
const STAFF_REFRESH_COOKIE_NAME = 'stackread_staff_refresh'

const DAY_IN_MS = 24 * 60 * 60 * 1000

const buildCookieOptions = (maxAge: number) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export const signTempToken = (
  payload: TempTokenPayload,
  secret: string,
  expiresIn: '5m' | '10m',
): string => {
  return jwt.sign(payload, secret, {
    issuer: config.jwt.issuer,
    expiresIn,
  })
}

export const verifyTempToken = (
  token: string,
  secret: string,
): TempTokenPayload => {
  const decoded = jwt.verify(token, secret, {
    issuer: config.jwt.issuer,
  })

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid temp token payload')
  }

  const payload = decoded as Partial<TempTokenPayload>

  if (!payload.id || !payload.email || !payload.actorType) {
    throw new Error('Invalid temp token payload')
  }

  return {
    id: payload.id,
    email: payload.email,
    actorType: payload.actorType,
    ...(payload.purpose === 'password-reset'
      ? { purpose: payload.purpose }
      : {}),
    ...(typeof payload.pending2FA === 'boolean'
      ? { pending2FA: payload.pending2FA }
      : {}),
    ...(typeof payload.mustSetup2FA === 'boolean'
      ? { mustSetup2FA: payload.mustSetup2FA }
      : {}),
  }
}

export const signAccessToken = (
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string,
): string => {
  const signOptions: jwt.SignOptions = {
    issuer: config.jwt.issuer,
    expiresIn: expiresIn as NonNullable<jwt.SignOptions['expiresIn']>,
  }

  const normalizedPayload = {
    ...payload,
    sub: payload.sub ?? payload.id,
    type: payload.type ?? payload.actorType,
  }

  return jwt.sign(normalizedPayload, secret, signOptions)
}

export const verifyAccessToken = (
  token: string,
  actorType: JwtActorType,
): BaseJwtPayload => {
  const decoded = jwt.verify(token, getSecretByActorType(actorType), {
    issuer: config.jwt.issuer,
  })

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload')
  }

  const payload = decoded as BaseJwtPayload

  if (!payload.type && payload.actorType) {
    payload.type = payload.actorType
  }

  if (!payload.sub && payload.id) {
    payload.sub = payload.id
  }

  if (payload.type !== actorType) {
    throw new Error(`Token actor type mismatch. Expected ${actorType}`)
  }

  return payload
}

const verifyRefreshTokenPayload = (
  token: string,
  secret: string,
  actorType: JwtActorType,
): BaseJwtPayload => {
  const decoded = jwt.verify(token, secret, {
    issuer: config.jwt.issuer,
  })

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid refresh token payload')
  }

  const payload = decoded as BaseJwtPayload

  if (!payload.type && payload.actorType) {
    payload.type = payload.actorType
  }

  if (!payload.sub && payload.id) {
    payload.sub = payload.id
  }

  if (payload.type !== actorType) {
    throw new Error(`Refresh token actor type mismatch. Expected ${actorType}`)
  }

  return payload
}

export const generateUserRefreshToken = (
  payload: AccessTokenPayload,
): string => {
  return signAccessToken(
    payload,
    `${config.jwt.userSecret}_refresh`,
    config.jwt.refreshExpiresIn,
  )
}

export const generateStaffRefreshToken = (
  payload: AccessTokenPayload,
): string => {
  return signAccessToken(
    payload,
    `${config.jwt.staffSecret}_refresh`,
    config.jwt.refreshExpiresIn,
  )
}

export const verifyUserRefreshToken = (token: string): BaseJwtPayload => {
  return verifyRefreshTokenPayload(
    token,
    `${config.jwt.userSecret}_refresh`,
    'user',
  )
}

export const verifyStaffRefreshToken = (token: string): BaseJwtPayload => {
  return verifyRefreshTokenPayload(
    token,
    `${config.jwt.staffSecret}_refresh`,
    'staff',
  )
}

export const extractBearerToken = (
  authorizationHeader?: string,
): string | null => {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token] = authorizationHeader.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token.trim()
}

export const getCookieValueFromHeader = (
  cookieHeader: string | undefined,
  cookieName: string,
): string | null => {
  if (!cookieHeader) {
    return null
  }

  const pairs = cookieHeader.split(';')

  for (const rawPair of pairs) {
    const [name, ...valueParts] = rawPair.trim().split('=')

    if (name === cookieName) {
      const value = valueParts.join('=')
      return value ? decodeURIComponent(value) : null
    }
  }

  return null
}

export const setUserSessionCookie = (
  response: Response,
  token: string,
): void => {
  response.cookie(
    USER_SESSION_COOKIE_NAME,
    token,
    buildCookieOptions(7 * DAY_IN_MS),
  )
}

export const setStaffSessionCookie = (
  response: Response,
  token: string,
): void => {
  response.cookie(
    STAFF_SESSION_COOKIE_NAME,
    token,
    buildCookieOptions(7 * DAY_IN_MS),
  )
}

export const clearUserSessionCookie = (response: Response): void => {
  response.clearCookie(USER_SESSION_COOKIE_NAME, buildCookieOptions(0))
}

export const clearStaffSessionCookie = (response: Response): void => {
  response.clearCookie(STAFF_SESSION_COOKIE_NAME, buildCookieOptions(0))
}

export const setUserRefreshCookie = (
  response: Response,
  token: string,
): void => {
  response.cookie(
    USER_REFRESH_COOKIE_NAME,
    token,
    buildCookieOptions(30 * DAY_IN_MS),
  )
}

export const setStaffRefreshCookie = (
  response: Response,
  token: string,
): void => {
  response.cookie(
    STAFF_REFRESH_COOKIE_NAME,
    token,
    buildCookieOptions(30 * DAY_IN_MS),
  )
}

export const clearUserRefreshCookie = (response: Response): void => {
  response.clearCookie(USER_REFRESH_COOKIE_NAME, buildCookieOptions(0))
}

export const clearStaffRefreshCookie = (response: Response): void => {
  response.clearCookie(STAFF_REFRESH_COOKIE_NAME, buildCookieOptions(0))
}
