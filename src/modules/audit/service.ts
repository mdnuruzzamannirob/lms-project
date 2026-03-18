import { Types } from 'mongoose'

import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import type {
  AuditExportFormat,
  AuditLogCreatePayload,
  IAuditLog,
} from './interface'
import { AuditLogModel } from './model'

const STAFF_TTL_DAYS = 180
const ADMIN_TTL_DAYS = 365 * 2

const computeExpiryDate = (actorType: 'staff' | 'admin'): Date => {
  const days = actorType === 'admin' ? ADMIN_TTL_DAYS : STAFF_TTL_DAYS
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

const formatAuditLog = (log: IAuditLog) => {
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

const serializeCsv = (logs: ReturnType<typeof formatAuditLog>[]): string => {
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

const buildFilter = (query: {
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

export const auditService = {
  createLog: async (payload: AuditLogCreatePayload) => {
    const created = await AuditLogModel.create({
      actorType: payload.actorType,
      actorId: new Types.ObjectId(payload.actorId),
      actorEmail: payload.actorEmail,
      action: payload.action,
      module: payload.module,
      description: payload.description,
      targetId: payload.targetId,
      targetType: payload.targetType,
      requestId: payload.requestId,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      meta: payload.meta ?? {},
      expiresAt: computeExpiryDate(payload.actorType),
    })

    return formatAuditLog(created)
  },

  listLogs: async (query: {
    page: number
    limit: number
    actorType?: 'staff' | 'admin'
    module?: string
    action?: string
    from?: Date
    to?: Date
  }) => {
    const filter = buildFilter(query)
    const pagination = getPaginationState(query)

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      AuditLogModel.countDocuments(filter),
    ])

    return {
      meta: createPaginationMeta(pagination, total),
      data: logs.map((log) => formatAuditLog(log as IAuditLog)),
    }
  },

  exportLogs: async (query: {
    format: AuditExportFormat
    actorType?: 'staff' | 'admin'
    module?: string
    action?: string
    from?: Date
    to?: Date
  }) => {
    const filter = buildFilter(query)
    const logs = await AuditLogModel.find(filter).sort({ createdAt: -1 })
    const formatted = logs.map((log) => formatAuditLog(log as IAuditLog))

    if (query.format === 'json') {
      return {
        format: 'json' as const,
        fileName: `audit-export-${Date.now()}.json`,
        contentType: 'application/json',
        content: JSON.stringify(formatted, null, 2),
        total: formatted.length,
      }
    }

    return {
      format: 'csv' as const,
      fileName: `audit-export-${Date.now()}.csv`,
      contentType: 'text/csv',
      content: serializeCsv(formatted),
      total: formatted.length,
    }
  },
}
