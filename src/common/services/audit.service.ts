import { type Model, Schema, model, models } from 'mongoose'

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

type AdminActivityLogDocument = {
  actorId: string
  actorType: 'staff' | 'admin' | 'system'
  actorEmail?: string
  action: string
  module: string
  targetId?: string
  targetType?: string
  description: string
  requestId?: string
  meta: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const adminActivityLogSchema = new Schema<AdminActivityLogDocument>(
  {
    actorId: { type: String, required: true, index: true },
    actorType: {
      type: String,
      enum: ['staff', 'admin', 'system'],
      required: true,
      index: true,
    },
    actorEmail: { type: String, required: false, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    targetId: { type: String, required: false, trim: true },
    targetType: { type: String, required: false, trim: true },
    description: { type: String, required: true, trim: true },
    requestId: { type: String, required: false, trim: true, index: true },
    meta: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'admin_activity_logs',
  },
)

const AdminActivityLogModel: Model<AdminActivityLogDocument> =
  (models.AdminActivityLog as Model<AdminActivityLogDocument> | undefined) ??
  model<AdminActivityLogDocument>('AdminActivityLog', adminActivityLogSchema)

export const auditService = {
  logEvent: async (payload: AuditEventPayload): Promise<void> => {
    await AdminActivityLogModel.create({
      actorId: payload.actor.id,
      actorType: payload.actor.type,
      actorEmail: payload.actor.email,
      action: payload.action,
      module: payload.module,
      targetId: payload.targetId,
      targetType: payload.targetType,
      description: payload.description,
      requestId: payload.requestId,
      meta: payload.meta ?? {},
    })

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
