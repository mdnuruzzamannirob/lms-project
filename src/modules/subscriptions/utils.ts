import { ClientSession } from 'mongoose'
import { ISubscription } from './interface'
import { SubscriptionModel } from './model'

export const toSubscriptionSummary = (subscription: ISubscription) => {
  return {
    id: subscription._id.toString(),
    userId: subscription.userId.toString(),
    planId: subscription.planId.toString(),
    previousPlanId: subscription.previousPlanId?.toString(),
    status: subscription.status,
    startedAt: subscription.startedAt.toISOString(),
    endsAt: subscription.endsAt?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    autoRenew: subscription.autoRenew,
    cancelledAt: subscription.cancelledAt?.toISOString(),
    cancellationReason: subscription.cancellationReason,
    pendingInvoiceId: subscription.pendingInvoiceId,
    retryStatus: subscription.retryStatus,
    retryAttemptCount: subscription.retryAttemptCount,
    retryNextAt: subscription.retryNextAt?.toISOString() ?? null,
    retryLastAttemptAt: subscription.retryLastAttemptAt?.toISOString() ?? null,
    retryLastError: subscription.retryLastError,
    scheduledPlanId: subscription.scheduledPlanId?.toString() ?? null,
    scheduledEffectiveDate:
      subscription.scheduledEffectiveDate?.toISOString() ?? null,
    latestPaymentId: subscription.latestPaymentId?.toString(),
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  }
}

export const computeEndAt = (startAt: Date, durationDays: number): Date => {
  return new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
}

export const getActiveSubscription = async (
  userId: string,
  session?: ClientSession,
) => {
  return SubscriptionModel.findOne({ userId, status: 'active' }).session(
    session ?? null,
  )
}

export const getSubscriptionById = async (
  id: string,
  session?: ClientSession,
) => {
  return SubscriptionModel.findById(id).session(session ?? null)
}
