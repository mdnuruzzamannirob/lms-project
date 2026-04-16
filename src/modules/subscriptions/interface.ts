import type { Types } from 'mongoose'

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'past_due'
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
  endsAt: Date | null
  currentPeriodEnd: Date | null
  autoRenew: boolean
  cancelledAt: Date | undefined
  cancellationReason: string | undefined
  pendingInvoiceId: string | null
  retryStatus: 'scheduled' | 'processing' | 'succeeded' | 'exhausted' | null
  retryAttemptCount: number
  retryNextAt: Date | null
  retryLastAttemptAt: Date | null
  retryLastError: string | null
  scheduledPlanId?: Types.ObjectId | null
  scheduledEffectiveDate?: Date | null
  latestPaymentId: Types.ObjectId | undefined
  stripeSubscriptionId: string | undefined
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

export interface ScheduleStripeRetryPayload {
  stripeSubscriptionId: string
  stripeInvoiceId: string
  stripeCustomerId?: string
  userId?: string
  planId?: string
  currentPeriodEnd?: Date | null
  reason?: string
}
