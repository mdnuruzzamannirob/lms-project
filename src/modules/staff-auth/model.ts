import { model, Schema, type Model } from 'mongoose'

import type {
  IStaffActivityLog,
  IStaffInviteToken,
  IStaffTwoFactorChallenge,
} from './interface'

const staffInviteTokenSchema = new Schema<IStaffInviteToken>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: false, trim: true },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: String, required: false },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

staffInviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const staffActivityLogSchema = new Schema<IStaffActivityLog>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    action: { type: String, required: true, trim: true },
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

staffActivityLogSchema.index({ staffId: 1, createdAt: -1 })

const staffTwoFactorChallengeSchema = new Schema<IStaffTwoFactorChallenge>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

staffTwoFactorChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const StaffInviteTokenModel: Model<IStaffInviteToken> =
  model<IStaffInviteToken>('StaffInviteToken', staffInviteTokenSchema)

export const StaffActivityLogModel: Model<IStaffActivityLog> =
  model<IStaffActivityLog>('StaffActivityLog', staffActivityLogSchema)

export const StaffTwoFactorChallengeModel: Model<IStaffTwoFactorChallenge> =
  model<IStaffTwoFactorChallenge>(
    'StaffTwoFactorChallenge',
    staffTwoFactorChallengeSchema,
  )
