import crypto from 'node:crypto'

import mongoose, { Types } from 'mongoose'
import Stripe from 'stripe'

import { AppError } from '../../common/errors/AppError'
import { config } from '../../config'
import { NotificationType } from '../notifications/interface'
import { notificationsService } from '../notifications/service'
import { PlanModel } from '../plans/model'
import { promotionsService } from '../promotions/service'
import { subscriptionsService } from '../subscriptions/service'
import type {
  InitiatePaymentPayload,
  IPayment,
  PaymentGateway,
  PaymentVerificationInput,
} from './interface'
import { PaymentModel, WebhookLogModel } from './model'
import {
  applyVerificationTransaction,
  ensureGatewayAvailableForCountry,
  formatPayment,
  getUserCountryCode,
  resolveCustomerCountry,
  resolveGatewayAdapter,
  toGatewayView,
} from './utils'

const listAvailablePaymentGatewaysForUser = async (userId: string) => {
  const userCountry = await getUserCountryCode(userId)

  return {
    countryCode: userCountry.countryCode,
    gateways: toGatewayView(userCountry.countryCode),
  }
}

const listMyPayments = async (userId: string) => {
  const payments = await PaymentModel.find({ userId }).sort({ createdAt: -1 })
  return payments.map(formatPayment)
}

const getMyPaymentById = async (userId: string, id: string) => {
  const payment = await PaymentModel.findOne({ _id: id, userId })
  if (!payment) throw new AppError('Payment not found.', 404)
  return formatPayment(payment)
}

const listPayments = async () => {
  const payments = await PaymentModel.find({}).sort({ createdAt: -1 })
  return payments.map(formatPayment)
}

const getPaymentById = async (id: string) => {
  const payment = await PaymentModel.findById(id)
  if (!payment) throw new AppError('Payment not found.', 404)
  return formatPayment(payment)
}

const initiatePayment = async (payload: InitiatePaymentPayload) => {
  const user = await getUserCountryCode(payload.userId)
  const selectedGatewayConfig = ensureGatewayAvailableForCountry(
    payload.gateway,
    user.countryCode,
  )

  const plan = await PlanModel.findById(payload.planId)
  if (!plan || !plan.isActive) {
    throw new AppError('Plan not found or inactive.', 404)
  }

  const discountResolution = await promotionsService.resolvePaymentDiscount({
    planId: payload.planId,
    amount: plan.price,
    ...(payload.couponCode ? { couponCode: payload.couponCode } : {}),
    userId: payload.userId,
  })

  const payableAmount = Number(
    Math.max(0, plan.price - discountResolution.discountAmount).toFixed(2),
  )

  const pendingSubscription =
    await subscriptionsService.createPendingSubscriptionForPlan({
      userId: payload.userId,
      planId: payload.planId,
      ...(typeof payload.autoRenew === 'boolean'
        ? { autoRenew: payload.autoRenew }
        : {}),
    })

  const reference = `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const gatewayAdapter = resolveGatewayAdapter(selectedGatewayConfig.gateway)

  if (payload.gateway === 'stripe' && !plan.stripePriceId) {
    throw new AppError(
      'Stripe plan is not synced yet. Please run plan Stripe sync first.',
      400,
    )
  }

  const gatewayResult = await gatewayAdapter.initiate({
    amount: payableAmount,
    currency: plan.currency,
    reference,
    customerName: user.name,
    customerEmail: user.email,
    customerCountry: resolveCustomerCountry(user.countryCode),
    metadata: {
      subscriptionId: pendingSubscription._id.toString(),
      userId: payload.userId,
      gateway: payload.gateway,
      planId: plan._id.toString(),
      planCode: plan.code,
      countryCode: user.countryCode ?? 'UNKNOWN',
    },
    ...(plan.stripePriceId ? { stripePriceId: plan.stripePriceId } : {}),
  })

  const payment = await PaymentModel.create({
    userId: new Types.ObjectId(payload.userId),
    subscriptionId: pendingSubscription._id,
    provider: gatewayResult.provider,
    gateway: payload.gateway,
    status: gatewayResult.status === 'success' ? 'success' : 'pending',
    amount: plan.price,
    currency: plan.currency,
    discountAmount: discountResolution.discountAmount,
    payableAmount,
    ...(discountResolution.couponId
      ? { couponId: new Types.ObjectId(discountResolution.couponId) }
      : {}),
    ...(discountResolution.flashSaleId
      ? { flashSaleId: new Types.ObjectId(discountResolution.flashSaleId) }
      : {}),
    providerPaymentId: gatewayResult.providerPaymentId,
    reference,
    metadata: {
      discountBreakdown: discountResolution.discountBreakdown,
      couponCode: discountResolution.couponCode,
    },
  })

  if (gatewayResult.status === 'success') {
    await paymentsService.verifyPayment({
      reference,
      providerPaymentId: gatewayResult.providerPaymentId,
      status: 'success',
    })
  }

  return {
    payment: formatPayment(payment),
    ...(payload.gateway === 'stripe'
      ? {
          sessionId: gatewayResult.providerPaymentId,
        }
      : {}),
    ...(gatewayResult.redirectUrl
      ? {
          url: gatewayResult.redirectUrl,
          redirectUrl: gatewayResult.redirectUrl,
          checkout_url: gatewayResult.redirectUrl,
        }
      : {}),
    ...(gatewayResult.clientSecret
      ? { clientSecret: gatewayResult.clientSecret }
      : {}),
  }
}

const verifyPayment = async (verification: PaymentVerificationInput) => {
  const session = await mongoose.startSession()
  try {
    let verifiedPayment: IPayment | null = null
    await session.withTransaction(async () => {
      verifiedPayment = await applyVerificationTransaction(
        verification,
        session,
      )
    })
    if (!verifiedPayment) {
      throw new AppError('Payment verification failed.', 500)
    }
    return formatPayment(verifiedPayment)
  } finally {
    await session.endSession()
  }
}

const refundPayment = async (paymentId: string, reason: string) => {
  const session = await mongoose.startSession()
  try {
    let refundedPayment: IPayment | null = null
    await session.withTransaction(async () => {
      const payment = await PaymentModel.findById(paymentId).session(session)
      if (!payment) throw new AppError('Payment not found.', 404)
      if (payment.status !== 'success') {
        throw new AppError('Only successful payments can be refunded.', 400)
      }

      if (payment.gateway === 'stripe') {
        if (!config.providers.stripeSecretKey) {
          throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
        }

        const paymentIntentId =
          typeof payment.metadata?.['paymentIntentId'] === 'string'
            ? payment.metadata['paymentIntentId']
            : undefined

        if (!paymentIntentId) {
          throw new AppError(
            'Stripe payment_intent is missing for this payment. Refund cannot be issued.',
            400,
          )
        }

        const stripe = new Stripe(config.providers.stripeSecretKey)
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: reason.toLowerCase().includes('fraud')
            ? 'fraudulent'
            : reason.toLowerCase().includes('duplicate')
              ? 'duplicate'
              : 'requested_by_customer',
        })
      }

      payment.status = 'refunded'
      payment.refundedAt = new Date()
      payment.refundReason = reason
      await payment.save({ session })

      refundedPayment = payment
    })
    if (!refundedPayment) {
      throw new AppError('Payment refund failed.', 500)
    }
    return formatPayment(refundedPayment)
  } finally {
    await session.endSession()
  }
}

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const getRawWebhookField = (
  raw: unknown,
  key: string,
): string | boolean | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }

  const value = (raw as Record<string, unknown>)[key]
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  return undefined
}

const markStripePaymentRefundedFromWebhook = async (payload: {
  paymentIntentId?: string
  reason?: string
}) => {
  if (!payload.paymentIntentId) {
    return null
  }

  const payment = await PaymentModel.findOne({
    gateway: 'stripe',
    $or: [
      { 'metadata.paymentIntentId': payload.paymentIntentId },
      { providerPaymentId: payload.paymentIntentId },
    ],
  })

  if (!payment) {
    return null
  }

  if (payment.status !== 'refunded') {
    payment.status = 'refunded'
    payment.refundedAt = new Date()

    if (payload.reason) {
      payment.refundReason = payload.reason
    }

    await payment.save()
  }

  return payment
}

const processWebhook = async (
  gateway: PaymentGateway,
  rawBody: string | Buffer,
  parsedBody: unknown,
  signature?: string,
  headers: Record<string, string | string[] | undefined> = {},
) => {
  const adapter = resolveGatewayAdapter(gateway)

  // Verify first — this extracts the canonical eventId (critical for Stripe).
  const verification = await adapter.verifyWebhook(
    rawBody,
    parsedBody,
    signature,
    headers,
  )

  // Idempotency: skip if this event has already been processed.
  const existingLog = await WebhookLogModel.findOne({
    provider: verification.provider,
    gateway,
    eventId: verification.eventId,
  })

  if (existingLog) {
    return {
      alreadyProcessed: true,
      processingStatus: existingLog.processingStatus,
      webhookLogId: existingLog._id.toString(),
    }
  }

  const webhookLog = await WebhookLogModel.create({
    provider: verification.provider,
    gateway,
    eventId: verification.eventId,
    ...(signature ? { signature } : {}),
    payload: Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody,
    processingStatus: 'received',
  })

  try {
    const eventType =
      verification.eventType ??
      (getRawWebhookField(verification.raw, 'eventType') as string | undefined)

    if (gateway === 'stripe' && eventType) {
      const stripeSubscriptionId = getRawWebhookField(
        verification.raw,
        'stripeSubscriptionId',
      ) as string | undefined
      const stripeCustomerId = getRawWebhookField(
        verification.raw,
        'stripeCustomerId',
      ) as string | undefined
      const paymentIntentId = getRawWebhookField(
        verification.raw,
        'paymentIntentId',
      ) as string | undefined
      const stripePriceId = getRawWebhookField(
        verification.raw,
        'stripePriceId',
      ) as string | undefined
      const userId = getRawWebhookField(verification.raw, 'userId') as
        | string
        | undefined
      const planId = getRawWebhookField(verification.raw, 'planId') as
        | string
        | undefined
      const stripeStatus = getRawWebhookField(verification.raw, 'status') as
        | string
        | undefined
      const cancelAtPeriodEnd = getRawWebhookField(
        verification.raw,
        'cancelAtPeriodEnd',
      ) as boolean | undefined
      const currentPeriodEnd = parseDate(
        getRawWebhookField(verification.raw, 'currentPeriodEnd'),
      )

      if (
        eventType === 'customer.subscription.updated' &&
        stripeSubscriptionId
      ) {
        const syncPayload = {
          stripeSubscriptionId,
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
          ...(userId ? { userId } : {}),
          ...(planId ? { planId } : {}),
          ...(stripePriceId ? { stripePriceId } : {}),
          ...(stripeStatus ? { status: stripeStatus } : {}),
          ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          ...(typeof cancelAtPeriodEnd === 'boolean'
            ? { cancelAtPeriodEnd }
            : {}),
        }

        const subscription =
          await subscriptionsService.syncSubscriptionFromStripe(syncPayload)

        webhookLog.processingStatus = 'processed'
        await webhookLog.save()

        return {
          alreadyProcessed: false,
          processingStatus: webhookLog.processingStatus,
          webhookLogId: webhookLog._id.toString(),
          subscriptionId: subscription?._id?.toString(),
        }
      }

      if (
        eventType === 'customer.subscription.deleted' &&
        stripeSubscriptionId
      ) {
        const cancelPayload = {
          stripeSubscriptionId,
          ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
        }

        const subscription =
          await subscriptionsService.markStripeSubscriptionCancelled(
            cancelPayload,
          )

        if (subscription) {
          await subscriptionsService.downgradeUserToFreePlan(
            subscription.userId.toString(),
            subscription.planId.toString(),
          )
        }

        webhookLog.processingStatus = 'processed'
        await webhookLog.save()

        return {
          alreadyProcessed: false,
          processingStatus: webhookLog.processingStatus,
          webhookLogId: webhookLog._id.toString(),
          subscriptionId: subscription?._id?.toString(),
        }
      }

      if (eventType === 'invoice.paid' && stripeSubscriptionId) {
        const paidSyncPayload = {
          stripeSubscriptionId,
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
          ...(userId ? { userId } : {}),
          ...(planId ? { planId } : {}),
          ...(stripePriceId ? { stripePriceId } : {}),
          status: 'active',
          ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
        }

        const subscription =
          await subscriptionsService.syncSubscriptionFromStripe(paidSyncPayload)

        webhookLog.processingStatus = 'processed'
        await webhookLog.save()

        return {
          alreadyProcessed: false,
          processingStatus: webhookLog.processingStatus,
          webhookLogId: webhookLog._id.toString(),
          subscriptionId: subscription?._id?.toString(),
        }
      }

      if (eventType === 'invoice.payment_failed' && stripeSubscriptionId) {
        const failedSyncPayload = {
          stripeSubscriptionId,
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
          ...(userId ? { userId } : {}),
          ...(planId ? { planId } : {}),
          ...(stripePriceId ? { stripePriceId } : {}),
          status: 'past_due',
          ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
        }

        const subscription =
          await subscriptionsService.syncSubscriptionFromStripe(
            failedSyncPayload,
          )

        await subscriptionsService.markStripeInvoicePaymentFailed({
          stripeSubscriptionId,
        })

        const notifyUserId =
          subscription?.userId?.toString() ??
          (typeof userId === 'string' ? userId : undefined)

        if (notifyUserId) {
          const notificationPayload = {
            userId: notifyUserId,
            type: NotificationType.SYSTEM_MESSAGE,
            title: 'Subscription payment failed',
            body: 'Your latest subscription payment failed. Please update your payment method to avoid service interruption.',
            ...(subscription?._id
              ? { relatedEntityId: subscription._id.toString() }
              : {}),
            relatedEntityType: 'subscription',
          }

          await notificationsService.createNotification({
            ...notificationPayload,
          })
        }

        webhookLog.processingStatus = 'processed'
        await webhookLog.save()

        return {
          alreadyProcessed: false,
          processingStatus: webhookLog.processingStatus,
          webhookLogId: webhookLog._id.toString(),
          subscriptionId: subscription?._id?.toString(),
        }
      }

      if (eventType === 'charge.refunded') {
        const refundedPayload = {
          ...(paymentIntentId ? { paymentIntentId } : {}),
          reason:
            (getRawWebhookField(verification.raw, 'refundReason') as
              | string
              | undefined) ?? 'Refunded via Stripe webhook',
        }

        const refundedPayment = await markStripePaymentRefundedFromWebhook({
          ...refundedPayload,
        })

        webhookLog.processingStatus = 'processed'
        if (refundedPayment) {
          webhookLog.processedPaymentId = refundedPayment._id
        }
        await webhookLog.save()

        return {
          alreadyProcessed: false,
          processingStatus: webhookLog.processingStatus,
          webhookLogId: webhookLog._id.toString(),
          ...(refundedPayment
            ? { paymentId: refundedPayment._id.toString() }
            : {}),
        }
      }
    }

    const reference = verification.reference
    const providerPaymentId = verification.providerPaymentId

    const hasLookupKey = Boolean(reference) || Boolean(providerPaymentId)

    if (!hasLookupKey) {
      webhookLog.processingStatus = 'ignored'
      webhookLog.errorMessage =
        'No payment lookup keys in webhook verification result.'
      await webhookLog.save()
      return {
        alreadyProcessed: false,
        processingStatus: webhookLog.processingStatus,
        webhookLogId: webhookLog._id.toString(),
      }
    }

    const payment = await paymentsService.verifyPayment({
      reference: reference ?? `fallback-${verification.eventId}`,
      ...(providerPaymentId ? { providerPaymentId } : {}),
      status: verification.status,
      ...(verification.raw && typeof verification.raw === 'object'
        ? {
            metadata: {
              ...(typeof (verification.raw as Record<string, unknown>)
                .stripeCustomerId === 'string'
                ? {
                    stripeCustomerId: (
                      verification.raw as Record<string, unknown>
                    ).stripeCustomerId,
                  }
                : {}),
              ...(typeof (verification.raw as Record<string, unknown>)
                .stripeSubscriptionId === 'string'
                ? {
                    stripeSubscriptionId: (
                      verification.raw as Record<string, unknown>
                    ).stripeSubscriptionId,
                  }
                : {}),
              ...(typeof (verification.raw as Record<string, unknown>)
                .paymentIntentId === 'string'
                ? {
                    paymentIntentId: (
                      verification.raw as Record<string, unknown>
                    ).paymentIntentId,
                  }
                : {}),
              ...(typeof (verification.raw as Record<string, unknown>)
                .currentPeriodEnd === 'string'
                ? {
                    currentPeriodEnd: (
                      verification.raw as Record<string, unknown>
                    ).currentPeriodEnd,
                  }
                : {}),
            },
          }
        : {}),
    })

    webhookLog.processingStatus = 'processed'
    webhookLog.processedPaymentId = new Types.ObjectId(payment.id)
    await webhookLog.save()

    return {
      alreadyProcessed: false,
      processingStatus: webhookLog.processingStatus,
      webhookLogId: webhookLog._id.toString(),
      paymentId: payment.id,
    }
  } catch (error) {
    webhookLog.processingStatus = 'failed'
    webhookLog.errorMessage =
      error instanceof Error ? error.message : String(error)
    await webhookLog.save()
    throw error
  }
}

export const paymentsService = {
  listAvailablePaymentGatewaysForUser,
  listMyPayments,
  getMyPaymentById,
  listPayments,
  getPaymentById,
  initiatePayment,
  verifyPayment,
  refundPayment,
  processWebhook,
}
