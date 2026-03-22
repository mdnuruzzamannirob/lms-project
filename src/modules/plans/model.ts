import { model, Schema, type Model } from 'mongoose'

import type { IPlan } from './interface'

const planSchema = new Schema<IPlan>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'BDT',
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    maxDevices: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    downloadEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    accessLevel: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      required: true,
      default: 'free',
      index: true,
    },
    features: {
      type: [String],
      default: [],
    },
    isFree: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

planSchema.index({ isActive: 1, sortOrder: 1, createdAt: 1 })

export const PlanModel: Model<IPlan> = model<IPlan>('Plan', planSchema)
