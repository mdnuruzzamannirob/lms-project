import { model, Schema, type Model } from 'mongoose'

import type { AuditActorType, IAuditLog } from './interface'

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorType: {
      type: String,
      enum: ['staff', 'admin'] satisfies AuditActorType[],
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: undefined,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    targetType: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    requestId: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
      index: true,
    },
    ipAddress: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    userAgent: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    meta: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
auditLogSchema.index({ actorType: 1, createdAt: -1 })
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 })

export const AuditLogModel: Model<IAuditLog> = model<IAuditLog>(
  'AuditLog',
  auditLogSchema,
)
