import type { Types } from 'mongoose'

export type AuditActorType = 'staff' | 'admin'

export type AuditExportFormat = 'json' | 'csv'

export interface IAuditLog {
  _id: Types.ObjectId
  actorType: AuditActorType
  actorId: Types.ObjectId
  actorEmail: string | undefined
  action: string
  module: string
  description: string
  targetId: string | undefined
  targetType: string | undefined
  requestId: string | undefined
  ipAddress: string | undefined
  userAgent: string | undefined
  meta: Record<string, unknown>
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export type AuditLogCreatePayload = {
  actorType: AuditActorType
  actorId: string
  actorEmail?: string
  action: string
  module: string
  description: string
  targetId?: string
  targetType?: string
  requestId?: string
  ipAddress?: string
  userAgent?: string
  meta?: Record<string, unknown>
}
