import { model, Schema, type Model } from 'mongoose'

import type { ISubscription, SubscriptionStatus } from './interface'

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    previousPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: false,
      default: undefined,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'active',
        'cancelled',
        'expired',
        'upgraded',
        'downgraded',
      ] satisfies SubscriptionStatus[],
      default: 'pending',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: false,
      default: undefined,
      index: true,
    },
    autoRenew: {
      type: Boolean,
      required: true,
      default: true,
    },
    cancelledAt: {
      type: Date,
      required: false,
      default: undefined,
    },
    cancellationReason: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    latestPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: false,
      default: undefined,
    },
    stripeSubscriptionId: {
      type: String,
      required: false,
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

subscriptionSchema.index({ userId: 1, createdAt: -1 })
subscriptionSchema.index({ userId: 1, status: 1 })

export const SubscriptionModel: Model<ISubscription> = model<ISubscription>(
  'Subscription',
  subscriptionSchema,
)
