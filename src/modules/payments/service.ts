import crypto from 'node:crypto'

import mongoose, { Types } from 'mongoose'
import Stripe from 'stripe'

import { AppError } from '../../common/errors/AppError'
import { emailService } from '../../common/services/email.service'
import { config } from '../../config'
import { logger } from '../../config/logger'
import { UserModel } from '../auth/model'
import { NotificationType } from '../notifications/interface'
import { notificationsService } from '../notifications/service'
import { OnboardingModel } from '../onboarding/model'
import { PlanModel } from '../plans/model'
import { getPlanBillingPrice } from '../plans/utils'
import { promotionsService } from '../promotions/service'
import { subscriptionsService } from '../subscriptions/service'
import type {
  InitiatePaymentPayload,
  IPayment,
  PaymentGateway,
  PaymentMethodPortalSessionPayload,
  PaymentMethodSummary,
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

const toTitleCase = (value: string): string => {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const buildFallbackPaymentMethodSummary = (
  latestPayment: IPayment | null,
): PaymentMethodSummary => {
  if (!latestPayment) {
    return {
      gateway: 'none',
      label: 'No payment method on file',
      status: 'missing',
    }
  }

  return {
    gateway: latestPayment.gateway,
    label: `${toTitleCase(latestPayment.gateway)} payment method`,
    status: 'missing',
  }
}

const getMyPaymentMethodSummary = async (
  userId: string,
): Promise<PaymentMethodSummary> => {
  const [user, latestPayment] = await Promise.all([
    UserModel.findById(userId).select('stripeCustomerId'),
    PaymentModel.findOne({ userId }).sort({ createdAt: -1 }),
  ])

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  if (!user.stripeCustomerId || !config.providers.stripeSecretKey) {
    return buildFallbackPaymentMethodSummary(latestPayment)
  }

  try {
    const stripe = new Stripe(config.providers.stripeSecretKey)
    const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
      expand: ['invoice_settings.default_payment_method'],
    })

    if ('deleted' in customer && customer.deleted) {
      return buildFallbackPaymentMethodSummary(latestPayment)
    }

    const defaultPaymentMethod =
      customer.invoice_settings.default_payment_method

    let cardPaymentMethod: Stripe.PaymentMethod | null = null

    if (
      defaultPaymentMethod &&
      typeof defaultPaymentMethod === 'object' &&
      defaultPaymentMethod.object === 'payment_method'
    ) {
      cardPaymentMethod = defaultPaymentMethod
    } else if (
      typeof defaultPaymentMethod === 'string' &&
      defaultPaymentMethod
    ) {
      const resolvedPaymentMethod =
        await stripe.paymentMethods.retrieve(defaultPaymentMethod)

      cardPaymentMethod = resolvedPaymentMethod
    }

    if (
      !cardPaymentMethod ||
      cardPaymentMethod.type !== 'card' ||
      !cardPaymentMethod.card
    ) {
      return buildFallbackPaymentMethodSummary(latestPayment)
    }

    const expMonth = cardPaymentMethod.card.exp_month
    const expYear = cardPaymentMethod.card.exp_year
    const expiryDate = new Date(expYear, expMonth, 0, 23, 59, 59, 999)
    const isExpired = expiryDate.getTime() < Date.now()
    const brand = toTitleCase(cardPaymentMethod.card.brand)
    const last4 = cardPaymentMethod.card.last4

    return {
      gateway: 'stripe',
      label: `${brand} ending in ${last4}`,
      status: isExpired ? 'expired' : 'ok',
      brand,
      last4,
      expMonth,
      expYear,
      ...(cardPaymentMethod.billing_details?.name
        ? { holderName: cardPaymentMethod.billing_details.name }
        : {}),
      expiresAt: expiryDate.toISOString(),
    }
  } catch (error) {
    logger.warn('Failed to resolve Stripe payment method summary.', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })

    return buildFallbackPaymentMethodSummary(latestPayment)
  }
}

const createMyPaymentMethodPortalSession = async (
  userId: string,
  payload: PaymentMethodPortalSessionPayload,
) => {
  if (!config.providers.stripeSecretKey) {
    throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
  }

  const user = await UserModel.findById(userId).select('stripeCustomerId')

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  if (!user.stripeCustomerId) {
    throw new AppError(
      'No Stripe customer found for this account. Complete a Stripe payment first.',
      400,
    )
  }

  const safeDefaultReturnUrl = `${config.frontendUrl}`
  const requestedReturnUrl = payload.returnUrl?.trim()
  const returnUrl =
    requestedReturnUrl && requestedReturnUrl.startsWith(config.frontendUrl)
      ? requestedReturnUrl
      : safeDefaultReturnUrl

  const stripe = new Stripe(config.providers.stripeSecretKey)
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  })

  return {
    url: session.url,
  }
}

const safeSendStripePaymentEmail = async (payload: {
  userId?: string
  status: 'success' | 'failed'
  planId?: string
  invoiceId?: string
  paymentIntentId?: string
  reason?: string
}) => {
  if (!payload.userId) {
    return
  }

  try {
    const user = await UserModel.findById(payload.userId).select('email')
    if (!user?.email) {
      return
    }

    const plan = payload.planId
      ? await PlanModel.findById(payload.planId).select('name code').lean()
      : null

    await emailService.sendEmail({
      to: user.email,
      subject:
        payload.status === 'success'
          ? 'Subscription payment successful'
          : 'Subscription payment failed',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>${payload.status === 'success' ? 'Payment successful' : 'Payment failed'}</h2>
          ${plan ? `<p><strong>Plan:</strong> ${plan.name} (${plan.code})</p>` : ''}
          ${payload.invoiceId ? `<p><strong>Invoice:</strong> ${payload.invoiceId}</p>` : ''}
          ${payload.paymentIntentId ? `<p><strong>Payment Intent:</strong> ${payload.paymentIntentId}</p>` : ''}
          ${payload.reason ? `<p><strong>Reason:</strong> ${payload.reason}</p>` : ''}
          <p>
            ${
              payload.status === 'success'
                ? 'Your subscription payment has been processed successfully.'
                : 'Your latest subscription payment failed. Please retry or update your payment method.'
            }
          </p>
        </div>
      `,
    })
  } catch (error) {
    logger.warn('Failed to send Stripe payment email.', {
      userId: payload.userId,
      status: payload.status,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

const safeCompleteOnboarding = async (userId?: string) => {
  if (!userId) {
    return
  }

  try {
    const existing = await OnboardingModel.findOne({ userId })
    if (existing?.status === 'completed' && existing.completedAt) {
      return
    }

    await OnboardingModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    )
  } catch (error) {
    logger.warn('Failed to mark onboarding completed after payment.', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
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

  const billingCycle = payload.billingCycle ?? 'monthly'
  const billingAmount = getPlanBillingPrice(plan.price, billingCycle)

  const discountResolution = await promotionsService.resolvePaymentDiscount({
    planId: payload.planId,
    amount: billingAmount,
    ...(payload.couponCode ? { couponCode: payload.couponCode } : {}),
    userId: payload.userId,
  })

  const payableAmount = Number(
    Math.max(0, billingAmount - discountResolution.discountAmount).toFixed(2),
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
      planId: plan._id.toString(),
      planCode: plan.code,
        billingCycle,
      countryCode: user.countryCode ?? 'UNKNOWN',
    },
    billingCycle,
    ...(payload.successUrl ? { successUrl: payload.successUrl } : {}),
    ...(payload.cancelUrl ? { cancelUrl: payload.cancelUrl } : {}),
  })

  const payment = await PaymentModel.create({
    userId: new Types.ObjectId(payload.userId),
    subscriptionId: pendingSubscription._id,
    provider: gatewayResult.provider,
    gateway: payload.gateway,
    status: gatewayResult.status === 'success' ? 'success' : 'pending',
    amount: billingAmount,
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
      billingCycle,
    },
  })

  if (gatewayResult.status === 'success') {
    await paymentsService.verifyPayment(
      {
        reference,
        providerPaymentId: gatewayResult.providerPaymentId,
        status: 'success',
      },
      {
        trustedSource: true,
      },
    )
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

const verifyPayment = async (
  verification: PaymentVerificationInput,
  options?: {
    trustedSource?: boolean
  },
) => {
  const session = await mongoose.startSession()
  try {
    let verifiedPayment: IPayment | null = null
    await session.withTransaction(async () => {
      verifiedPayment = await applyVerificationTransaction(
        verification,
        session,
        {
          trustedSource: options?.trustedSource ?? false,
        },
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

const confirmStripeCheckoutSessionForUser = async (payload: {
  userId: string
  sessionId: string
  reference?: string
}) => {
  if (!config.providers.stripeSecretKey) {
    throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
  }

  const stripe = new Stripe(config.providers.stripeSecretKey)
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    payload.sessionId,
  )

  const metadataUserId =
    typeof checkoutSession.metadata?.['userId'] === 'string'
      ? checkoutSession.metadata['userId']
      : undefined

  if (metadataUserId && metadataUserId !== payload.userId) {
    throw new AppError('Checkout session does not belong to this user.', 403)
  }

  const resolvedReference =
    (typeof checkoutSession.metadata?.['reference'] === 'string'
      ? checkoutSession.metadata['reference']
      : undefined) ?? payload.reference
  const resolvedPlanId =
    typeof checkoutSession.metadata?.['planId'] === 'string'
      ? checkoutSession.metadata['planId']
      : undefined

  if (!resolvedReference) {
    throw new AppError('Unable to resolve payment reference from session.', 400)
  }

  const payment = await PaymentModel.findOne({
    $or: [
      { providerPaymentId: checkoutSession.id },
      { reference: resolvedReference },
    ],
    userId: new Types.ObjectId(payload.userId),
  })

  if (!payment) {
    throw new AppError(
      'Payment not found for the provided Stripe session.',
      404,
    )
  }

  if (checkoutSession.payment_status !== 'paid') {
    return {
      payment: formatPayment(payment),
      onboardingCompleted: false,
      status: 'pending',
    }
  }

  const stripeSubscriptionId =
    typeof checkoutSession.subscription === 'string'
      ? checkoutSession.subscription
      : checkoutSession.subscription &&
          typeof checkoutSession.subscription === 'object' &&
          'id' in checkoutSession.subscription &&
          typeof checkoutSession.subscription.id === 'string'
        ? checkoutSession.subscription.id
        : undefined

  let stripeSubscription: Stripe.Subscription | null = null
  if (stripeSubscriptionId) {
    stripeSubscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId)
  }

  const subscriptionRecord = stripeSubscription as unknown as {
    status?: string
    customer?: string | Stripe.Customer | Stripe.DeletedCustomer
    items?: {
      data?: Array<{
        price?: {
          id?: string
        }
      }>
    }
    current_period_end?: number
  } | null

  const stripeCustomerId =
    typeof checkoutSession.customer === 'string'
      ? checkoutSession.customer
      : subscriptionRecord && typeof subscriptionRecord.customer === 'string'
        ? subscriptionRecord.customer
        : undefined

  const stripePriceId = subscriptionRecord?.items?.data?.[0]?.price?.id
  const currentPeriodEnd =
    typeof subscriptionRecord?.current_period_end === 'number'
      ? new Date(subscriptionRecord.current_period_end * 1000)
      : undefined

  const verified = await verifyPayment(
    {
      reference: resolvedReference,
      providerPaymentId: checkoutSession.id,
      status: 'success',
      metadata: {
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
        ...(typeof checkoutSession.payment_intent === 'string'
          ? { paymentIntentId: checkoutSession.payment_intent }
          : {}),
        ...(currentPeriodEnd
          ? { currentPeriodEnd: currentPeriodEnd.toISOString() }
          : {}),
      },
    },
    {
      trustedSource: true,
    },
  )

  await safeCompleteOnboarding(payload.userId)

  return {
    payment: verified,
    onboardingCompleted: true,
    status: 'completed',
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
  const webhookRaw =
    verification.raw && typeof verification.raw === 'object'
      ? (verification.raw as Record<string, unknown>)
      : undefined

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
        webhookRaw,
        'stripeSubscriptionId',
      ) as string | undefined
      const stripeCustomerId = getRawWebhookField(
        webhookRaw,
        'stripeCustomerId',
      ) as string | undefined
      const paymentIntentId = getRawWebhookField(
        webhookRaw,
        'paymentIntentId',
      ) as string | undefined
      const stripePriceId = getRawWebhookField(webhookRaw, 'stripePriceId') as
        | string
        | undefined
      const userId = getRawWebhookField(webhookRaw, 'userId') as
        | string
        | undefined
      const planId = getRawWebhookField(webhookRaw, 'planId') as
        | string
        | undefined
      const stripeStatus = getRawWebhookField(webhookRaw, 'status') as
        | string
        | undefined
      const cancelAtPeriodEnd = getRawWebhookField(
        webhookRaw,
        'cancelAtPeriodEnd',
      ) as boolean | undefined
      const currentPeriodEnd = parseDate(
        getRawWebhookField(webhookRaw, 'currentPeriodEnd'),
      )

      if (
        stripeSubscriptionId &&
        typeof eventType === 'string' &&
        [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.resumed',
          'customer.subscription.paused',
        ].includes(eventType)
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

        await safeCompleteOnboarding(subscription?.userId?.toString() ?? userId)

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
          if (subscription.scheduledPlanId) {
            await subscriptionsService.finalizeScheduledPeriodEndTransition(
              subscription._id.toString(),
            )
          } else {
            await subscriptionsService.downgradeUserToFreePlan(
              subscription.userId.toString(),
              subscription.planId.toString(),
            )
          }
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

        await subscriptionsService.markStripeInvoicePaymentRetrySucceeded({
          stripeSubscriptionId,
          ...(typeof webhookRaw?.['invoiceId'] === 'string'
            ? { stripeInvoiceId: webhookRaw['invoiceId'] }
            : {}),
        })

        await safeCompleteOnboarding(subscription?.userId?.toString() ?? userId)

        const successEmailPayload: Parameters<
          typeof safeSendStripePaymentEmail
        >[0] = {
          status: 'success',
        }

        const successUserId = subscription?.userId?.toString() ?? userId
        if (typeof successUserId === 'string') {
          successEmailPayload.userId = successUserId
        }

        const successPlanId = subscription?.planId?.toString() ?? planId
        if (typeof successPlanId === 'string') {
          successEmailPayload.planId = successPlanId
        }

        if (typeof paymentIntentId === 'string') {
          successEmailPayload.paymentIntentId = paymentIntentId
        }

        if (typeof webhookRaw?.['invoiceId'] === 'string') {
          successEmailPayload.invoiceId = webhookRaw['invoiceId'] as string
        }

        await safeSendStripePaymentEmail(successEmailPayload)

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
        const invoiceId =
          typeof webhookRaw?.['invoiceId'] === 'string'
            ? (webhookRaw['invoiceId'] as string)
            : stripeSubscriptionId
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
          stripeInvoiceId: invoiceId,
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
          ...(userId ? { userId } : {}),
          ...(planId ? { planId } : {}),
          ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
          reason: 'Latest invoice payment failed',
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

        const failedEmailPayload: Parameters<
          typeof safeSendStripePaymentEmail
        >[0] = {
          status: 'failed',
          reason: 'Latest invoice payment failed',
        }

        if (notifyUserId) {
          failedEmailPayload.userId = notifyUserId
        }

        const failedPlanId = subscription?.planId?.toString() ?? planId
        if (typeof failedPlanId === 'string') {
          failedEmailPayload.planId = failedPlanId
        }

        if (typeof paymentIntentId === 'string') {
          failedEmailPayload.paymentIntentId = paymentIntentId
        }

        if (typeof invoiceId === 'string') {
          failedEmailPayload.invoiceId = invoiceId
        }

        await safeSendStripePaymentEmail(failedEmailPayload)

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

    const payment = await paymentsService.verifyPayment(
      {
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
      },
      {
        trustedSource: true,
      },
    )

    if (payment.gateway === 'stripe' && payment.status === 'success') {
      await safeCompleteOnboarding(payment.userId)
    }

    if (
      payment.gateway === 'stripe' &&
      payment.status === 'success' &&
      eventType !== 'checkout.session.completed' &&
      eventType !== 'invoice.paid'
    ) {
      await safeSendStripePaymentEmail({
        userId: payment.userId,
        status: 'success',
        ...(typeof payment.providerPaymentId === 'string'
          ? { paymentIntentId: payment.providerPaymentId }
          : {}),
      })
    }

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
  getMyPaymentMethodSummary,
  createMyPaymentMethodPortalSession,
  listPayments,
  getPaymentById,
  initiatePayment,
  verifyPayment,
  confirmStripeCheckoutSessionForUser,
  refundPayment,
  processWebhook,
}
