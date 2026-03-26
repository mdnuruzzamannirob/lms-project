import type { Types } from 'mongoose'

export interface IStaffTwoFactor {
  enabled: boolean
  secret: string | undefined
  pendingSecret: string | undefined
  lastVerifiedAt: Date | undefined
}

export interface IStaff {
  _id: Types.ObjectId
  name: string
  email: string
  passwordHash: string
  phone: string | undefined
  roleId?: Types.ObjectId
  isSuperAdmin: boolean
  isActive: boolean
  deletedAt?: Date
  twoFactor: IStaffTwoFactor
  createdAt: Date
  updatedAt: Date
}

export interface InviteStaffPayload {
  name: string
  email: string
  roleId: string
  phone?: string
  expiresInDays: number
}

export interface CreateStaffFromInvitePayload {
  email: string
  name: string
  password: string
  roleId: string
  phone?: string
}
