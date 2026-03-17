import { model, Schema, type Model } from 'mongoose'

import type { IStaff, IStaffTwoFactor } from './interface'

type StaffDocument = IStaff

const twoFactorSchema = new Schema<IStaffTwoFactor>(
  {
    enabled: { type: Boolean, default: false },
    secret: { type: String, required: false, default: undefined },
    pendingSecret: { type: String, required: false, default: undefined },
    lastVerifiedAt: { type: Date, required: false, default: undefined },
  },
  { _id: false },
)

const staffSchema = new Schema<StaffDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: false, trim: true, default: undefined },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    twoFactor: {
      type: twoFactorSchema,
      default: () => ({
        enabled: false,
        secret: undefined,
        pendingSecret: undefined,
        lastVerifiedAt: undefined,
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

staffSchema.index({ roleId: 1, isActive: 1 })

export const StaffModel: Model<StaffDocument> = model<StaffDocument>(
  'Staff',
  staffSchema,
)
