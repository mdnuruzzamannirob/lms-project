import { Types } from 'mongoose'

import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import type {
  AuditLogCreatePayload,
  AuditLogsExportQuery,
  AuditLogsListQuery,
  IAuditLog,
} from './interface'
import { AuditLogModel } from './model'
import {
  buildFilter,
  computeExpiryDate,
  formatAuditLog,
  serializeCsv,
} from './utils'

const createLog = async (payload: AuditLogCreatePayload) => {
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
}

const listLogs = async (query: AuditLogsListQuery) => {
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
}

const exportLogs = async (query: AuditLogsExportQuery) => {
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
}

export const auditService = {
  createLog,
  listLogs,
  exportLogs,
}
