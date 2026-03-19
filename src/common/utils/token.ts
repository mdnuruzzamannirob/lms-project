import jwt from 'jsonwebtoken'

import { config } from '../../config'
import type { BaseJwtPayload } from '../../types/express'

type JwtActorType = 'user' | 'staff'

export type TempTokenPayload = {
  id: string
  email: string
  actorType: JwtActorType
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
