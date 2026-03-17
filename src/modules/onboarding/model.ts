import { model, Schema, type Model } from 'mongoose'

import type { IOnboarding, OnboardingStatus } from './interface'

const onboardingSchema = new Schema<IOnboarding>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    selectedPlanCode: { type: String, required: false, trim: true },
    selectedPlanName: { type: String, required: false, trim: true },
    selectedPlanPrice: { type: Number, required: false },
    selectedAt: { type: Date, required: false },
    status: {
      type: String,
      enum: ['pending', 'selected', 'completed'] satisfies OnboardingStatus[],
      default: 'pending',
      index: true,
    },
    completedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

export const OnboardingModel: Model<IOnboarding> = model<IOnboarding>(
  'Onboarding',
  onboardingSchema,
)
