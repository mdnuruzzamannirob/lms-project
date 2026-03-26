import mongoose, { ClientSession, Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
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
    await target.save({ session: transactionSession })

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

      subscription.status = 'cancelled'
      subscription.cancelledAt = new Date()
      subscription.cancellationReason = reason
      subscription.autoRenew = false
      await subscription.save({ session })

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
}
