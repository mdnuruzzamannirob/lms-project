import mongoose, { ClientSession, Types } from 'mongoose'
import Stripe from 'stripe'

import { AppError } from '../../common/errors/AppError'
import { config } from '../../config'
import { UserModel } from '../auth/model'
import { PlanModel } from '../plans/model'
import type {
  ActivateSubscriptionFromPaymentPayload,
  AdminUpdateSubscriptionPayload,
  ChangePlanWithTransactionPayload,
  CreatePendingSubscriptionPayload,
  CreateSubscriptionPayload,
  ISubscription,
} from './interface'
import { SubscriptionModel } from './model'
import {
  computeEndAt,
  getActiveSubscription,
  getSubscriptionById as getSubscriptionByIdWithSession,
  toSubscriptionSummary,
} from './utils'

const getMyCurrentSubscription = async (userId: string) => {
  const subscription = await SubscriptionModel.findOne({
    userId,
    status: { $in: ['active', 'pending'] },
  }).sort({ createdAt: -1 })

  if (!subscription) {
    return null
  }

  return toSubscriptionSummary(subscription)
}

const getMySubscriptionHistory = async (userId: string) => {
  const subscriptions = await SubscriptionModel.find({ userId }).sort({
    createdAt: -1,
  })
  return subscriptions.map((subscription) =>
    toSubscriptionSummary(subscription),
  )
}

const listSubscriptions = async () => {
  const subscriptions = await SubscriptionModel.find({}).sort({
    createdAt: -1,
  })
  return subscriptions.map((subscription) =>
    toSubscriptionSummary(subscription),
  )
}

const getSubscriptionById = async (id: string) => {
  const subscription = await SubscriptionModel.findById(id)

  if (!subscription) {
    throw new AppError('Subscription not found.', 404)
  }

  return toSubscriptionSummary(subscription)
}

const createSubscription = async (payload: CreateSubscriptionPayload) => {
  const plan = await PlanModel.findById(payload.planId)

  if (!plan || !plan.isActive) {
    throw new AppError('Plan not found or inactive.', 404)
  }

  const startAt = new Date()
  const endAt = computeEndAt(startAt, plan.durationDays)

  const subscription = await SubscriptionModel.create({
    userId: new Types.ObjectId(payload.userId),
    planId: plan._id,
    status: plan.isFree ? 'active' : 'pending',
    startedAt: startAt,
    endsAt: endAt,
    currentPeriodEnd: endAt,
    autoRenew: payload.autoRenew,
  })

  return toSubscriptionSummary(subscription)
}

const createPendingSubscriptionForPlan = async (
  payload: CreatePendingSubscriptionPayload,
  session?: ClientSession,
): Promise<ISubscription> => {
  const plan = await PlanModel.findById(payload.planId).session(session ?? null)

  if (!plan || !plan.isActive) {
    throw new AppError('Plan not found or inactive.', 404)
  }

  const startAt = new Date()
  const endAt = computeEndAt(startAt, plan.durationDays)

  const existingPending = await SubscriptionModel.findOne({
    userId: payload.userId,
    status: 'pending',
    planId: plan._id,
  }).session(session ?? null)

  if (existingPending) {
    return existingPending
  }

  const [created] = await SubscriptionModel.create(
    [
      {
        userId: new Types.ObjectId(payload.userId),
        planId: plan._id,
        status: plan.isFree ? 'active' : 'pending',
        startedAt: startAt,
        endsAt: endAt,
        currentPeriodEnd: endAt,
        autoRenew: payload.autoRenew ?? true,
      },
    ],
    { session },
  )

  if (!created) {
    throw new AppError('Failed to create pending subscription.', 500)
  }

  return created
}

const activateSubscriptionFromPayment = async (
  payload: ActivateSubscriptionFromPaymentPayload,
  session?: ClientSession,
) => {
  const applyActivation = async (transactionSession: ClientSession) => {
    const target = await getSubscriptionByIdWithSession(
      payload.subscriptionId,
      transactionSession,
    )

    if (!target) {
      throw new AppError(
        'Subscription not found for payment verification.',
        404,
      )
    }

    const activeSubscription = await getActiveSubscription(
      payload.userId,
      transactionSession,
    )

    if (
      activeSubscription &&
      activeSubscription._id.toString() !== target._id.toString()
    ) {
      activeSubscription.status = 'expired'
      await activeSubscription.save({ session: transactionSession })
    }

    target.status = 'active'
    target.latestPaymentId = new Types.ObjectId(payload.paymentId)
    target.cancellationReason = undefined
    target.cancelledAt = undefined

    const payment = await mongoose
      .model('Payment')
      .findById(payload.paymentId)
      .session(transactionSession)

    const stripeSubscriptionId =
      typeof payment?.metadata?.['stripeSubscriptionId'] === 'string'
        ? payment.metadata['stripeSubscriptionId']
        : undefined
    const stripeCustomerId =
      typeof payment?.metadata?.['stripeCustomerId'] === 'string'
        ? payment.metadata['stripeCustomerId']
        : undefined
    const stripeCurrentPeriodEnd =
      typeof payment?.metadata?.['currentPeriodEnd'] === 'string'
        ? new Date(payment.metadata['currentPeriodEnd'])
        : undefined

    if (stripeSubscriptionId) {
      target.stripeSubscriptionId = stripeSubscriptionId
    }

    if (
      stripeCurrentPeriodEnd &&
      !Number.isNaN(stripeCurrentPeriodEnd.getTime())
    ) {
      target.currentPeriodEnd = stripeCurrentPeriodEnd
      target.endsAt = stripeCurrentPeriodEnd
    }

    await target.save({ session: transactionSession })

    if (stripeCustomerId) {
      await UserModel.updateOne(
        { _id: payload.userId },
        { $set: { stripeCustomerId } },
        { session: transactionSession },
      )
    }

    return target
  }

  if (session) {
    const updated = await applyActivation(session)
    return toSubscriptionSummary(updated)
  }

  const transactionSession = await mongoose.startSession()

  try {
    let result: ISubscription | null = null

    await transactionSession.withTransaction(async () => {
      result = await applyActivation(transactionSession)
    })

    if (!result) {
      throw new AppError('Subscription activation failed.', 500)
    }

    return toSubscriptionSummary(result)
  } finally {
    await transactionSession.endSession()
  }
}

const cancelMySubscription = async (userId: string, reason: string) => {
  const session = await mongoose.startSession()

  try {
    let result: ISubscription | null = null

    await session.withTransaction(async () => {
      const subscription = await SubscriptionModel.findOne({
        userId,
        status: 'active',
      }).session(session)

      if (!subscription) {
        throw new AppError('Active subscription not found.', 404)
      }

      if (subscription.stripeSubscriptionId) {
        if (!config.providers.stripeSecretKey) {
          throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
        }

        const stripe = new Stripe(config.providers.stripeSecretKey)
        const updated = await stripe.subscriptions.update(
          subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          },
        )

        subscription.autoRenew = false
        subscription.cancellationReason = reason

        const updatedData = updated as unknown as {
          current_period_end?: number
        }

        if (typeof updatedData.current_period_end === 'number') {
          const periodEnd = new Date(updatedData.current_period_end * 1000)
          subscription.currentPeriodEnd = periodEnd
          subscription.endsAt = periodEnd
        }

        // Keep status as active and wait for customer.subscription.deleted webhook
        // to finalize cancellation in the database.
        await subscription.save({ session })
      } else {
        subscription.status = 'cancelled'
        subscription.cancelledAt = new Date()
        subscription.cancellationReason = reason
        subscription.autoRenew = false
        await subscription.save({ session })
      }

      result = subscription
    })

    if (!result) {
      throw new AppError('Subscription cancellation failed.', 500)
    }

    return toSubscriptionSummary(result)
  } finally {
    await session.endSession()
  }
}

const renewMySubscription = async (userId: string) => {
  const session = await mongoose.startSession()

  try {
    let result: ISubscription | null = null

    await session.withTransaction(async () => {
      const subscription = await SubscriptionModel.findOne({
        userId,
        status: 'active',
      }).session(session)

      if (!subscription) {
        throw new AppError('Active subscription not found.', 404)
      }

      const plan = await PlanModel.findById(subscription.planId).session(
        session,
      )

      if (!plan || !plan.isActive) {
        throw new AppError('Plan not found or inactive.', 404)
      }

      subscription.endsAt = computeEndAt(subscription.endsAt, plan.durationDays)
      subscription.status = 'active'
      subscription.autoRenew = true
      await subscription.save({ session })

      result = subscription
    })

    if (!result) {
      throw new AppError('Subscription renewal failed.', 500)
    }

    return toSubscriptionSummary(result)
  } finally {
    await session.endSession()
  }
}

const changePlanWithTransaction = async (
  payload: ChangePlanWithTransactionPayload,
) => {
  const session = await mongoose.startSession()

  try {
    let result: ISubscription | null = null

    await session.withTransaction(async () => {
      const current = await SubscriptionModel.findOne({
        userId: payload.userId,
        status: 'active',
      }).session(session)

      if (!current) {
        throw new AppError('Active subscription not found.', 404)
      }

      const newPlan = await PlanModel.findById(payload.newPlanId).session(
        session,
      )

      if (!newPlan || !newPlan.isActive) {
        throw new AppError('Requested plan not found or inactive.', 404)
      }

      current.status = payload.mode === 'upgrade' ? 'upgraded' : 'downgraded'
      await current.save({ session })

      const startAt = new Date()
      const endsAt = computeEndAt(startAt, newPlan.durationDays)

      const [newSubscription] = await SubscriptionModel.create(
        [
          {
            userId: current.userId,
            planId: newPlan._id,
            previousPlanId: current.planId,
            status: newPlan.isFree ? 'active' : 'pending',
            startedAt: startAt,
            endsAt,
            autoRenew: current.autoRenew,
          },
        ],
        { session },
      )

      if (!newSubscription) {
        throw new AppError('Failed to create changed subscription.', 500)
      }

      result = newSubscription
    })

    if (!result) {
      throw new AppError('Subscription plan change failed.', 500)
    }

    return toSubscriptionSummary(result)
  } finally {
    await session.endSession()
  }
}

const adminUpdateSubscription = async (
  id: string,
  payload: AdminUpdateSubscriptionPayload,
) => {
  const subscription = await SubscriptionModel.findById(id)

  if (!subscription) {
    throw new AppError('Subscription not found.', 404)
  }

  if (typeof payload.status === 'string') {
    subscription.status = payload.status
  }

  if (typeof payload.autoRenew === 'boolean') {
    subscription.autoRenew = payload.autoRenew
  }

  if (typeof payload.cancellationReason === 'string') {
    subscription.cancellationReason = payload.cancellationReason
    subscription.cancelledAt = new Date()
  }

  await subscription.save()

  return toSubscriptionSummary(subscription)
}

type SyncStripeSubscriptionPayload = {
  stripeSubscriptionId: string
  stripeCustomerId?: string
  userId?: string
  planId?: string
  stripePriceId?: string
  status?: string
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
}

const mapStripeStatusToLocal = (
  stripeStatus: string | undefined,
): ISubscription['status'] => {
  if (!stripeStatus) return 'active'

  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return 'active'
  }

  if (
    stripeStatus === 'canceled' ||
    stripeStatus === 'incomplete_expired' ||
    stripeStatus === 'unpaid'
  ) {
    return 'cancelled'
  }

  return 'pending'
}

const resolvePlanIdForStripeSync = async (
  payload: SyncStripeSubscriptionPayload,
): Promise<Types.ObjectId | undefined> => {
  if (payload.planId) {
    const plan = await PlanModel.findById(payload.planId).select('_id').lean()
    if (plan?._id) {
      return plan._id
    }
  }

  if (payload.stripePriceId) {
    const plan = await PlanModel.findOne({
      stripePriceId: payload.stripePriceId,
      isActive: true,
    })
      .select('_id')
      .lean()

    if (plan?._id) {
      return plan._id
    }
  }

  return undefined
}

const resolveUserIdForStripeSync = async (
  payload: SyncStripeSubscriptionPayload,
): Promise<Types.ObjectId | undefined> => {
  if (payload.userId) {
    return new Types.ObjectId(payload.userId)
  }

  if (payload.stripeCustomerId) {
    const user = await UserModel.findOne({
      stripeCustomerId: payload.stripeCustomerId,
    })
      .select('_id')
      .lean()

    if (user?._id) {
      return user._id
    }
  }

  return undefined
}

const syncSubscriptionFromStripe = async (
  payload: SyncStripeSubscriptionPayload,
) => {
  const userObjectId = await resolveUserIdForStripeSync(payload)
  const planObjectId = await resolvePlanIdForStripeSync(payload)
  const now = new Date()
  const periodEnd = payload.currentPeriodEnd ?? now

  if (userObjectId && payload.stripeCustomerId) {
    await UserModel.updateOne(
      { _id: userObjectId },
      { $set: { stripeCustomerId: payload.stripeCustomerId } },
    )
  }

  if (userObjectId && planObjectId) {
    const synced = await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: payload.stripeSubscriptionId },
      {
        $set: {
          userId: userObjectId,
          planId: planObjectId,
          stripeSubscriptionId: payload.stripeSubscriptionId,
          ...(payload.currentPeriodEnd
            ? { currentPeriodEnd: payload.currentPeriodEnd, endsAt: periodEnd }
            : {}),
          ...(typeof payload.cancelAtPeriodEnd === 'boolean'
            ? { autoRenew: !payload.cancelAtPeriodEnd }
            : {}),
          ...(payload.status
            ? { status: mapStripeStatusToLocal(payload.status) }
            : {}),
          ...(payload.status === 'canceled' ? { cancelledAt: now } : {}),
        },
        $setOnInsert: {
          startedAt: now,
          endsAt: periodEnd,
          currentPeriodEnd: periodEnd,
          autoRenew:
            typeof payload.cancelAtPeriodEnd === 'boolean'
              ? !payload.cancelAtPeriodEnd
              : true,
          status: payload.status
            ? mapStripeStatusToLocal(payload.status)
            : 'active',
        },
      },
      { new: true, upsert: true },
    )

    return synced
  }

  const existing = await SubscriptionModel.findOne({
    stripeSubscriptionId: payload.stripeSubscriptionId,
  })

  if (!existing) {
    return null
  }

  if (planObjectId) {
    existing.planId = planObjectId
  }

  if (payload.currentPeriodEnd) {
    existing.currentPeriodEnd = payload.currentPeriodEnd
    existing.endsAt = payload.currentPeriodEnd
  }

  if (typeof payload.cancelAtPeriodEnd === 'boolean') {
    existing.autoRenew = !payload.cancelAtPeriodEnd
  }

  if (payload.status) {
    existing.status = mapStripeStatusToLocal(payload.status)
    if (payload.status === 'canceled') {
      existing.cancelledAt = now
    }
  }

  await existing.save()
  return existing
}

const markStripeSubscriptionCancelled = async (
  payload: Pick<
    SyncStripeSubscriptionPayload,
    'stripeSubscriptionId' | 'currentPeriodEnd'
  >,
) => {
  const subscription = await SubscriptionModel.findOne({
    stripeSubscriptionId: payload.stripeSubscriptionId,
  })

  if (!subscription) {
    return null
  }

  subscription.status = 'cancelled'
  subscription.autoRenew = false
  subscription.cancelledAt = new Date()

  if (payload.currentPeriodEnd) {
    subscription.currentPeriodEnd = payload.currentPeriodEnd
    subscription.endsAt = payload.currentPeriodEnd
  }

  await subscription.save()
  return subscription
}

const markStripeInvoicePaid = async (
  payload: Pick<
    SyncStripeSubscriptionPayload,
    'stripeSubscriptionId' | 'currentPeriodEnd' | 'status'
  >,
) => {
  const subscription = await SubscriptionModel.findOne({
    stripeSubscriptionId: payload.stripeSubscriptionId,
  })

  if (!subscription) {
    return null
  }

  subscription.status = payload.status
    ? mapStripeStatusToLocal(payload.status)
    : 'active'

  if (payload.currentPeriodEnd) {
    subscription.currentPeriodEnd = payload.currentPeriodEnd
    subscription.endsAt = payload.currentPeriodEnd
  }

  await subscription.save()
  return subscription
}

const markStripeInvoicePaymentFailed = async (
  payload: Pick<SyncStripeSubscriptionPayload, 'stripeSubscriptionId'>,
) => {
  const subscription = await SubscriptionModel.findOne({
    stripeSubscriptionId: payload.stripeSubscriptionId,
  })

  if (!subscription) {
    return null
  }

  // Keep history but flag that renewal is no longer healthy.
  subscription.status = 'pending'
  await subscription.save()
  return subscription
}

const downgradeUserToFreePlan = async (
  userId: string,
  previousPlanId: string,
) => {
  const freePlan = await PlanModel.findOne({ isFree: true, isActive: true })

  if (!freePlan) {
    return null
  }

  const existingFree = await SubscriptionModel.findOne({
    userId,
    planId: freePlan._id,
    status: 'active',
  })

  if (existingFree) {
    return existingFree
  }

  const startAt = new Date()
  const endsAt = computeEndAt(startAt, freePlan.durationDays)

  const downgraded = await SubscriptionModel.create({
    userId: new Types.ObjectId(userId),
    planId: freePlan._id,
    previousPlanId: new Types.ObjectId(previousPlanId),
    status: 'active',
    startedAt: startAt,
    endsAt,
    currentPeriodEnd: endsAt,
    autoRenew: true,
  })

  return downgraded
}

export const subscriptionsService = {
  getMyCurrentSubscription,
  getMySubscriptionHistory,
  listSubscriptions,
  getSubscriptionById,
  createSubscription,
  createPendingSubscriptionForPlan,
  cancelMySubscription,
  renewMySubscription,
  changePlanWithTransaction,
  activateSubscriptionFromPayment,
  adminUpdateSubscription,
  syncSubscriptionFromStripe,
  markStripeSubscriptionCancelled,
  markStripeInvoicePaid,
  markStripeInvoicePaymentFailed,
  downgradeUserToFreePlan,
}
