import crypto from 'node:crypto'

import mongoose, { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import { PlanModel } from '../plans/model'
import { promotionsService } from '../promotions/service'
import { subscriptionsService } from '../subscriptions/service'
import type {
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

const initiatePayment = async (payload: {
  userId: string
  planId: string
  gateway: PaymentGateway
  couponCode?: string
  autoRenew?: boolean
}) => {
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
      countryCode: user.countryCode ?? 'UNKNOWN',
    },
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
    ...(gatewayResult.redirectUrl
      ? { redirectUrl: gatewayResult.redirectUrl }
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

      payment.status = 'refunded'
      payment.refundedAt = new Date()
      payment.refundReason = reason
      await payment.save({ session })

      const subscription = await mongoose
        .model('Subscription')
        .findById(payment.subscriptionId)
        .session(session)

      if (subscription) {
        subscription.status = 'cancelled'
        subscription.cancelledAt = new Date()
        subscription.cancellationReason = `Refunded payment: ${reason}`
        subscription.autoRenew = false
        await subscription.save({ session })
      }

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

const processWebhook = async (
  gateway: PaymentGateway,
  rawBody: string,
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
    payload: rawBody,
    processingStatus: 'received',
  })

  try {
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
