import type { Request } from 'express'

import { AppError } from '../../common/errors/AppError'
import { ADMIN_TTL_DAYS, STAFF_TTL_DAYS } from './constants'
import { IAuditLog } from './interface'

export const getStaffAuth = (request: Request) => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth
}

export const getClientIp = (request: Request): string | undefined => {
  const forwarded = request.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim()
  }

  return request.socket.remoteAddress
}

export const computeExpiryDate = (actorType: 'staff' | 'admin'): Date => {
  const days = actorType === 'admin' ? ADMIN_TTL_DAYS : STAFF_TTL_DAYS
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export const formatAuditLog = (log: IAuditLog) => {
  return {
    id: log._id.toString(),
    actorType: log.actorType,
    actorId: log.actorId.toString(),
    actorEmail: log.actorEmail,
    action: log.action,
    module: log.module,
    description: log.description,
    targetId: log.targetId,
    targetType: log.targetType,
    requestId: log.requestId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    meta: log.meta,
    expiresAt: log.expiresAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  }
}

const escapeCsv = (value: unknown): string => {
  const raw = String(value ?? '')
  if (/[,\n\"]/g.test(raw)) {
    return `"${raw.replace(/\"/g, '""')}"`
  }
  return raw
}

export const serializeCsv = (
  logs: ReturnType<typeof formatAuditLog>[],
): string => {
  const header = [
    'id',
    'actorType',
    'actorId',
    'actorEmail',
    'action',
    'module',
    'description',
    'targetId',
    'targetType',
    'requestId',
    'ipAddress',
    'userAgent',
    'meta',
    'expiresAt',
    'createdAt',
  ].join(',')

  const rows = logs.map((log) =>
    [
      log.id,
      log.actorType,
      log.actorId,
      log.actorEmail ?? '',
      log.action,
      log.module,
      log.description,
      log.targetId ?? '',
      log.targetType ?? '',
      log.requestId ?? '',
      log.ipAddress ?? '',
      log.userAgent ?? '',
      JSON.stringify(log.meta ?? {}),
      log.expiresAt,
      log.createdAt,
    ]
      .map((value) => escapeCsv(value))
      .join(','),
  )

  return [header, ...rows].join('\n')
}

export const buildFilter = (query: {
  actorType?: 'staff' | 'admin'
  module?: string
  action?: string
  from?: Date
  to?: Date
}) => {
  const filter: Record<string, unknown> = {}

  if (query.actorType) {
    filter.actorType = query.actorType
  }

  if (query.module) {
    filter.module = query.module
  }

  if (query.action) {
    filter.action = query.action
  }

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    }
  }

  return filter
}
