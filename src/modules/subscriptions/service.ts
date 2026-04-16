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

const buildSubscriptionPeriod = (
  startAt: Date,
  durationDays: number,
  isFree: boolean,
) => {
  if (isFree) {
    return {
      endsAt: null,
      currentPeriodEnd: null,
    }
  }

  const endsAt = computeEndAt(startAt, durationDays)
  return {
    endsAt,
    currentPeriodEnd: endsAt,
  }
}

const STRIPE_RETRY_DELAYS_MS = [
  15 * 60 * 1000,
  6 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
]

const getStripeRetryDelay = (attemptCount: number): number | null => {
  return STRIPE_RETRY_DELAYS_MS[attemptCount] ?? null
}

const clearStripeRetryState = (subscription: ISubscription) => {
  subscription.pendingInvoiceId = null
  subscription.retryStatus = null
  subscription.retryAttemptCount = 0
  subscription.retryNextAt = null
  subscription.retryLastAttemptAt = null
  subscription.retryLastError = null
}

const getMyCurrentSubscription = async (userId: string) => {
  const subscription = await SubscriptionModel.findOne({
    userId,
    status: { $in: ['active', 'pending', 'past_due'] },
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
  const period = buildSubscriptionPeriod(
    startAt,
    plan.durationDays,
    plan.isFree,
  )

  const subscription = await SubscriptionModel.create({
    userId: new Types.ObjectId(payload.userId),
    planId: plan._id,
    status: plan.isFree ? 'active' : 'pending',
    startedAt: startAt,
    endsAt: period.endsAt,
    currentPeriodEnd: period.currentPeriodEnd,
    autoRenew: plan.isFree ? false : payload.autoRenew,
    pendingInvoiceId: null,
    retryStatus: null,
    retryAttemptCount: 0,
    retryNextAt: null,
    retryLastAttemptAt: null,
    retryLastError: null,
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
  const period = buildSubscriptionPeriod(
    startAt,
    plan.durationDays,
    plan.isFree,
  )

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
        endsAt: period.endsAt,
        currentPeriodEnd: period.currentPeriodEnd,
        autoRenew: plan.isFree ? false : (payload.autoRenew ?? true),
        pendingInvoiceId: null,
        retryStatus: null,
        retryAttemptCount: 0,
        retryNextAt: null,
        retryLastAttemptAt: null,
        retryLastError: null,
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
    clearStripeRetryState(target)

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

const cancelMySubscription = async (
  userId: string,
  reason: string,
  immediate = false,
) => {
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

      if (plan?.isFree) {
        throw new AppError('Free plan cannot be cancelled or renewed.', 400)
      }

      if (subscription.stripeSubscriptionId) {
        if (!config.providers.stripeSecretKey) {
          throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
        }

        const stripe = new Stripe(config.providers.stripeSecretKey)
        if (immediate) {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
          subscription.status = 'cancelled'
          subscription.cancelledAt = new Date()
          subscription.autoRenew = false
          subscription.cancellationReason = reason
          subscription.currentPeriodEnd = new Date()
          subscription.endsAt = new Date()
        } else {
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
        }
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

      if (plan?.isFree) {
        throw new AppError('Free plan cannot be renewed.', 400)
      }

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

      const currentPlan = await PlanModel.findById(current.planId).session(
        session,
      )

      const newPlan = await PlanModel.findById(payload.newPlanId).session(
        session,
      )

      if (!newPlan || !newPlan.isActive) {
        throw new AppError('Requested plan not found or inactive.', 404)
      }

      if (currentPlan?.isFree) {
        throw new AppError('Free plan cannot be upgraded or downgraded.', 400)
      }

      if (currentPlan?._id.toString() === newPlan._id.toString()) {
        throw new AppError('Requested plan is already active.', 400)
      }

      const currentPeriodEnd = current.currentPeriodEnd ?? current.endsAt
      if (payload.mode === 'downgrade') {
        if (!currentPeriodEnd) {
          throw new AppError(
            'Current subscription period is not available for downgrade scheduling.',
            400,
          )
        }

        current.scheduledPlanId = newPlan._id
        current.scheduledEffectiveDate = currentPeriodEnd
        current.autoRenew = false

        if (newPlan.isFree) {
          current.cancellationReason = 'Scheduled downgrade to free plan.'
        }

        await current.save({ session })

        result = current
        return
      }

      const startAt = new Date()

      let upgradedPeriodEnd: Date | null = null

      if (
        current.stripeSubscriptionId &&
        config.providers.stripeSecretKey &&
        newPlan.stripePriceId
      ) {
        const stripe = new Stripe(config.providers.stripeSecretKey)
        const stripeSubscription = await stripe.subscriptions.retrieve(
          current.stripeSubscriptionId,
        )
        const currentItemId = stripeSubscription.items.data[0]?.id

        if (!currentItemId) {
          throw new AppError(
            'Stripe subscription item not found for upgrade.',
            400,
          )
        }

        const updatedSubscription = await stripe.subscriptions.update(
          current.stripeSubscriptionId,
          {
            cancel_at_period_end: false,
            proration_behavior: 'create_prorations',
            items: [
              {
                id: currentItemId,
                price: newPlan.stripePriceId,
              },
            ],
          },
        )

        const updatedPeriodEnd = (
          updatedSubscription as unknown as {
            current_period_end?: number
          }
        ).current_period_end

        if (typeof updatedPeriodEnd === 'number') {
          upgradedPeriodEnd = new Date(updatedPeriodEnd * 1000)
        }
      }

      current.planId = newPlan._id
      current.previousPlanId = currentPlan?._id ?? current.previousPlanId
      current.status = 'active'
      current.startedAt = current.startedAt ?? startAt
      current.scheduledPlanId = null
      current.scheduledEffectiveDate = null
      current.autoRenew = newPlan.isFree ? false : current.autoRenew

      if (newPlan.isFree) {
        current.endsAt = null
        current.currentPeriodEnd = null
      } else {
        const endsAt =
          upgradedPeriodEnd ?? computeEndAt(startAt, newPlan.durationDays)
        current.endsAt = endsAt
        current.currentPeriodEnd = endsAt
      }

      await current.save({ session })

      result = current
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

  if (stripeStatus === 'past_due') {
    return 'past_due'
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

    if (synced && payload.status === 'active') {
      clearStripeRetryState(synced)
      await synced.save()
    }

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
    if (payload.status === 'active' || payload.status === 'trialing') {
      clearStripeRetryState(existing)
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
  clearStripeRetryState(subscription)

  if (payload.currentPeriodEnd) {
    subscription.currentPeriodEnd = payload.currentPeriodEnd
    subscription.endsAt = payload.currentPeriodEnd
  }

  await subscription.save()
  return subscription
}

const markStripeInvoicePaymentFailed = async (payload: {
  stripeSubscriptionId: string
  stripeInvoiceId: string
  stripeCustomerId?: string
  userId?: string
  planId?: string
  currentPeriodEnd?: Date | null
  reason?: string
}) => {
  const subscription = await SubscriptionModel.findOne({
    stripeSubscriptionId: payload.stripeSubscriptionId,
  })

  if (!subscription) {
    return null
  }

  subscription.status = 'past_due'
  subscription.pendingInvoiceId = payload.stripeInvoiceId
  subscription.retryStatus = 'scheduled'
  subscription.retryAttemptCount = (subscription.retryAttemptCount ?? 0) + 1
  subscription.retryLastAttemptAt = new Date()
  subscription.retryLastError =
    payload.reason ?? 'Stripe invoice payment failed.'

  const delay = getStripeRetryDelay(subscription.retryAttemptCount - 1)
  if (delay === null) {
    subscription.retryStatus = 'exhausted'
    subscription.retryNextAt = null
    subscription.status = 'expired'
    subscription.autoRenew = false
    subscription.cancelledAt = new Date()
    subscription.pendingInvoiceId = null
  } else {
    subscription.retryNextAt = new Date(Date.now() + delay)
  }

  if (payload.userId) {
    subscription.userId = new Types.ObjectId(payload.userId)
  }

  if (payload.planId) {
    subscription.planId = new Types.ObjectId(payload.planId)
  }

  if (payload.stripeCustomerId) {
    await UserModel.updateOne(
      { _id: subscription.userId },
      { $set: { stripeCustomerId: payload.stripeCustomerId } },
    )
  }

  if (payload.currentPeriodEnd) {
    subscription.currentPeriodEnd = payload.currentPeriodEnd
    subscription.endsAt = payload.currentPeriodEnd
  }

  await subscription.save()
  return subscription
}

const retryStripeInvoicePayment = async (subscriptionId: string) => {
  const subscription = await SubscriptionModel.findById(subscriptionId)

  if (!subscription) {
    throw new AppError('Subscription not found.', 404)
  }

  if (!subscription.pendingInvoiceId) {
    throw new AppError('No pending Stripe invoice retry found.', 400)
  }

  if (!config.providers.stripeSecretKey) {
    throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
  }

  if (subscription.retryStatus === 'processing') {
    throw new AppError('Stripe invoice retry is already processing.', 409)
  }

  const stripe = new Stripe(config.providers.stripeSecretKey)

  subscription.retryStatus = 'processing'
  subscription.retryLastAttemptAt = new Date()
  subscription.retryLastError = null
  await subscription.save()

  try {
    await stripe.invoices.pay(subscription.pendingInvoiceId)
    return subscription
  } catch (error) {
    subscription.retryAttemptCount += 1
    const delay = getStripeRetryDelay(subscription.retryAttemptCount - 1)
    subscription.retryNextAt =
      delay === null ? null : new Date(Date.now() + delay)
    subscription.retryLastError =
      error instanceof Error ? error.message : String(error)

    if (delay === null) {
      subscription.retryStatus = 'exhausted'
      subscription.status = 'expired'
      subscription.autoRenew = false
      subscription.cancelledAt = new Date()
      subscription.pendingInvoiceId = null
    } else {
      subscription.retryStatus = 'scheduled'
    }

    await subscription.save()
    throw error
  }
}

const retryMyStripeInvoicePayment = async (userId: string) => {
  const subscription = await SubscriptionModel.findOne({
    userId,
    pendingInvoiceId: { $ne: null },
  }).sort({ updatedAt: -1 })

  if (!subscription) {
    throw new AppError('No pending Stripe invoice retry found.', 404)
  }

  return retryStripeInvoicePayment(subscription._id.toString())
}

const processDueStripeInvoiceRetries = async () => {
  const dueSubscriptions = await SubscriptionModel.find({
    retryStatus: 'scheduled',
    retryNextAt: { $lte: new Date() },
    pendingInvoiceId: { $ne: null },
  }).select('_id')

  const attempted: string[] = []

  for (const subscription of dueSubscriptions) {
    try {
      await retryStripeInvoicePayment(subscription._id.toString())
      attempted.push(subscription._id.toString())
    } catch {
      // Keep the worker moving so one bad retry does not block the rest.
    }
  }

  return { attempted: attempted.length }
}

const markStripeInvoicePaymentRetrySucceeded = async (payload: {
  stripeSubscriptionId: string
  stripeInvoiceId?: string
}) => {
  const subscription = await SubscriptionModel.findOne({
    stripeSubscriptionId: payload.stripeSubscriptionId,
  })

  if (!subscription) {
    return null
  }

  if (
    payload.stripeInvoiceId &&
    subscription.pendingInvoiceId !== payload.stripeInvoiceId
  ) {
    return subscription
  }

  clearStripeRetryState(subscription)
  subscription.status = 'active'
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
    pendingInvoiceId: null,
    retryStatus: null,
    retryAttemptCount: 0,
    retryNextAt: null,
    retryLastAttemptAt: null,
    retryLastError: null,
  })

  return downgraded
}

const finalizeScheduledPeriodEndTransition = async (subscriptionId: string) => {
  const current = await SubscriptionModel.findById(subscriptionId)

  if (!current) {
    return null
  }

  const targetPlan = current.scheduledPlanId
    ? await PlanModel.findById(current.scheduledPlanId)
    : await PlanModel.findOne({ isFree: true, isActive: true })

  if (!targetPlan || !targetPlan.isActive) {
    return null
  }

  current.status = 'expired'
  current.autoRenew = false
  current.cancelledAt = new Date()
  current.scheduledPlanId = null
  current.scheduledEffectiveDate = null
  await current.save()

  const startAt = new Date()
  const period = buildSubscriptionPeriod(
    startAt,
    targetPlan.durationDays,
    targetPlan.isFree,
  )

  const nextSubscription = await SubscriptionModel.create({
    userId: current.userId,
    planId: targetPlan._id,
    previousPlanId: current.planId,
    status: 'active',
    startedAt: startAt,
    endsAt: period.endsAt,
    currentPeriodEnd: period.currentPeriodEnd,
    autoRenew: !targetPlan.isFree,
    pendingInvoiceId: null,
    retryStatus: null,
    retryAttemptCount: 0,
    retryNextAt: null,
    retryLastAttemptAt: null,
    retryLastError: null,
  })

  return nextSubscription
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
  retryStripeInvoicePayment,
  retryMyStripeInvoicePayment,
  processDueStripeInvoiceRetries,
  markStripeInvoicePaymentRetrySucceeded,
  downgradeUserToFreePlan,
  finalizeScheduledPeriodEndTransition,
}
