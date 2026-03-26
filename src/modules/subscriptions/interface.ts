import type { Types } from 'mongoose'

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'upgraded'
  | 'downgraded'

export interface ISubscription {
  _id: Types.ObjectId
  userId: Types.ObjectId
  planId: Types.ObjectId
  previousPlanId: Types.ObjectId | undefined
  status: SubscriptionStatus
  startedAt: Date
  endsAt: Date
  autoRenew: boolean
  cancelledAt: Date | undefined
  cancellationReason: string | undefined
  latestPaymentId: Types.ObjectId | undefined
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubscriptionPayload {
  userId: string
  planId: string
  autoRenew: boolean
}

export interface CreatePendingSubscriptionPayload {
  userId: string
  planId: string
  autoRenew?: boolean
}

export interface ActivateSubscriptionFromPaymentPayload {
  subscriptionId: string
  paymentId: string
  userId: string
}

export interface ChangePlanWithTransactionPayload {
  userId: string
  newPlanId: string
  mode: 'upgrade' | 'downgrade'
}

export interface AdminUpdateSubscriptionPayload {
  status?: SubscriptionStatus
  autoRenew?: boolean
  cancellationReason?: string
}
