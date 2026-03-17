import { logger } from '../../config/logger'

export type AuditActor = {
  id: string
  type: 'staff' | 'admin' | 'system'
  email?: string
}

export type AuditEventPayload = {
  actor: AuditActor
  action: string
  module: string
  targetId?: string
  targetType?: string
  description: string
  requestId?: string
  meta?: Record<string, unknown>
}

export const auditService = {
  logEvent: async (payload: AuditEventPayload): Promise<void> => {
    logger.info('Audit event', {
      actor: payload.actor,
      action: payload.action,
      module: payload.module,
      targetId: payload.targetId,
      targetType: payload.targetType,
      description: payload.description,
      requestId: payload.requestId,
      meta: payload.meta,
      timestamp: new Date().toISOString(),
    })
  },
}
