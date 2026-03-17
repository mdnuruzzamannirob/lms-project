import jwt from 'jsonwebtoken'

import { config } from '../../config'
import type { BaseJwtPayload } from '../../types/express'

type JwtActorType = 'user' | 'staff'

type SignPayloadInput = {
  sub: string
  type: JwtActorType
  email?: string
  role?: string
  permissions?: string[]
}

const getSecretByActorType = (type: JwtActorType): string => {
  return type === 'user' ? config.jwt.userSecret : config.jwt.staffSecret
}

export const signAccessToken = (payload: SignPayloadInput): string => {
  const signOptions: jwt.SignOptions = {
    issuer: config.jwt.issuer,
    subject: payload.sub,
  }

  if (config.jwt.accessExpiresIn) {
    signOptions.expiresIn = config.jwt.accessExpiresIn as NonNullable<
      jwt.SignOptions['expiresIn']
    >
  }

  return jwt.sign(payload, getSecretByActorType(payload.type), signOptions)
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
