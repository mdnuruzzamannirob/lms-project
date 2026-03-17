import type { Types } from 'mongoose'

export interface IStaffInviteToken {
  _id: Types.ObjectId
  email: string
  name: string
  phone?: string
  roleId: Types.ObjectId
  tokenHash: string
  invitedBy?: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IStaffActivityLog {
  _id: Types.ObjectId
  staffId: Types.ObjectId
  action: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface IStaffTwoFactorChallenge {
  _id: Types.ObjectId
  staffId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  consumedAt?: Date
  createdAt: Date
  updatedAt: Date
}
