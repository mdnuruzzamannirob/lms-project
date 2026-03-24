import type { RequestHandler } from 'express'

import * as paypalSdk from '@paypal/checkout-server-sdk'
import { type ClientSession } from 'mongoose'
import SSLCommerzPayment from 'sslcommerz-lts'
import Stripe from 'stripe'
import { AppError } from '../../common/errors/AppError'
import { config } from '../../config'
import { UserModel } from '../auth'
import { promotionsService } from '../promotions'
import { subscriptionsService } from '../subscriptions'
import { paymentGatewayCountryConfig } from './gateway.config'
import {
  GatewayInitResult,
  IPayment,
  PaymentGateway,
  PaymentGatewayAdapter,
  PaymentVerificationInput,
  PayPalOrderResult,
  WebhookVerificationResult,
} from './interface'
import { PaymentModel } from './model'

export const getGatewayParam = (
  request: Parameters<RequestHandler>[0],
): 'bkash' | 'nagad' | 'paypal' | 'stripe' => {
  const gateway = request.params.gateway

  if (
    gateway !== 'bkash' &&
    gateway !== 'nagad' &&
    gateway !== 'paypal' &&
    gateway !== 'stripe'
  ) {
    throw new AppError('Invalid webhook gateway.', 400)
  }

  return gateway
}

// ---------------------------------------------------------------------------
// SSLCommerz adapter  (bKash + Nagad)
// ---------------------------------------------------------------------------

export class SslCommerzBangladeshAdapter implements PaymentGatewayAdapter {
  constructor(public readonly gateway: 'bkash' | 'nagad') {}

  private getClient(): SSLCommerzPayment {
    const { sslCommerzStoreId, sslCommerzStorePassword, sslCommerzIsLive } =
      config.providers
    if (!sslCommerzStoreId || !sslCommerzStorePassword) {
      throw new AppError('SSLCommerz credentials are not configured.', 500)
    }
    return new SSLCommerzPayment(
      sslCommerzStoreId,
      sslCommerzStorePassword,
      sslCommerzIsLive,
    )
  }

  async initiate(payload: {
    amount: number
    currency: string
    reference: string
    customerName: string
    customerEmail: string
    customerCountry: string
    metadata: Record<string, string>
  }): Promise<GatewayInitResult> {
    const client = this.getClient()
    const ref = encodeURIComponent(payload.reference)

    const response = await client.init({
      total_amount: payload.amount,
      currency: payload.currency,
      tran_id: payload.reference,
      success_url: `${config.frontendUrl}/payment/success?ref=${ref}`,
      fail_url: `${config.frontendUrl}/payment/failed?ref=${ref}`,
      cancel_url: `${config.frontendUrl}/payment/cancel?ref=${ref}`,
      ipn_url: `${config.backendUrl}${config.apiPrefix}/webhooks/${this.gateway}`,
      shipping_method: 'NO',
      product_name: 'LMS Subscription',
      product_category: 'Subscription',
      product_profile: 'general',
      cus_name: payload.customerName,
      cus_email: payload.customerEmail,
      cus_phone: '01700000000',
      cus_add1: 'Bangladesh',
      cus_city: 'Dhaka',
      cus_country: payload.customerCountry,
    })

    if (!response.GatewayPageURL) {
      throw new AppError(
        `SSLCommerz payment initiation failed: status=${String(response.status)}`,
        502,
      )
    }

    return {
      provider: 'sslcommerz',
      providerPaymentId:
        typeof response.sessionkey === 'string'
          ? response.sessionkey
          : payload.reference,
      status: 'pending',
      redirectUrl: response.GatewayPageURL,
    }
  }

  async verifyWebhook(
    rawBody: string,
    parsedBody: unknown,
    _signature: string | undefined,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult> {
    // SSLCommerz IPN arrives as application/x-www-form-urlencoded.
    // Express's urlencoded() middleware already parsed it into parsedBody.
    const body =
      parsedBody != null && typeof parsedBody === 'object'
        ? (parsedBody as Record<string, unknown>)
        : {}

    let valId: string | undefined =
      typeof body['val_id'] === 'string' ? body['val_id'] : undefined

    // Fallback: try parsing rawBody as form-encoded data
    if (!valId) {
      try {
        valId = new URLSearchParams(rawBody).get('val_id') ?? undefined
      } catch {
        // ignore
      }
    }

    if (!valId) {
      throw new AppError('Missing val_id in SSLCommerz IPN payload.', 400)
    }

    const client = this.getClient()
    const validation = await client.validate({ val_id: valId })

    const isValid =
      validation.status === 'VALID' || validation.status === 'VALIDATED'
    const tranId =
      typeof validation.tran_id === 'string' ? validation.tran_id : undefined
    const bankTranId =
      typeof validation.bank_tran_id === 'string'
        ? validation.bank_tran_id
        : valId

    return {
      provider: 'sslcommerz',
      eventId: bankTranId,
      providerPaymentId: valId,
      ...(tranId ? { reference: tranId } : {}),
      status: isValid ? 'success' : 'failed',
      raw: validation,
    }
  }
}

// ---------------------------------------------------------------------------
// Stripe adapter
// ---------------------------------------------------------------------------

export class StripeGatewayAdapter implements PaymentGatewayAdapter {
  public readonly gateway = 'stripe' as const

  private getClient(): Stripe {
    if (!config.providers.stripeSecretKey) {
      throw new AppError('STRIPE_SECRET_KEY is not configured.', 500)
    }
    return new Stripe(config.providers.stripeSecretKey)
  }

  async initiate(payload: {
    amount: number
    currency: string
    reference: string
    customerName: string
    customerEmail: string
    customerCountry: string
    metadata: Record<string, string>
  }): Promise<GatewayInitResult> {
    const stripe = this.getClient()

    const paymentIntent = await stripe.paymentIntents.create({
      // Stripe requires the smallest currency unit (paise / cents / etc.)
      amount: Math.round(payload.amount * 100),
      currency: payload.currency.toLowerCase(),
      receipt_email: payload.customerEmail,
      metadata: {
        reference: payload.reference,
        customerName: payload.customerName,
        ...payload.metadata,
      },
    })

    return {
      provider: 'stripe',
      providerPaymentId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'success' : 'pending',
      ...(paymentIntent.client_secret
        ? { clientSecret: paymentIntent.client_secret }
        : {}),
    }
  }

  async verifyWebhook(
    rawBody: string,
    _parsedBody: unknown,
    signature: string | undefined,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult> {
    if (!config.providers.stripeWebhookSecret) {
      throw new AppError('STRIPE_WEBHOOK_SECRET is not configured.', 500)
    }
    if (!signature) {
      throw new AppError(
        'Stripe-Signature header is missing from webhook request.',
        400,
      )
    }

    const stripe = this.getClient()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.providers.stripeWebhookSecret,
      )
    } catch (err) {
      throw new AppError(
        `Stripe webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
        400,
      )
    }

    const pi = event.data.object as Stripe.PaymentIntent
    const status: 'success' | 'failed' | 'pending' =
      event.type === 'payment_intent.succeeded'
        ? 'success'
        : event.type === 'payment_intent.payment_failed'
          ? 'failed'
          : 'pending'

    const reference =
      typeof pi.metadata?.['reference'] === 'string'
        ? pi.metadata['reference']
        : undefined

    return {
      provider: 'stripe',
      eventId: event.id,
      providerPaymentId: pi.id,
      ...(reference ? { reference } : {}),
      status,
      raw: event,
    }
  }
}

// ---------------------------------------------------------------------------
// PayPal adapter  (@paypal/checkout-server-sdk + REST API for verification)
// ---------------------------------------------------------------------------

export class PaypalGatewayAdapter implements PaymentGatewayAdapter {
  public readonly gateway = 'paypal' as const

  private getCredentials(): { clientId: string; clientSecret: string } {
    const { paypalClientId, paypalClientSecret } = config.providers
    if (!paypalClientId || !paypalClientSecret) {
      throw new AppError('PayPal credentials are not configured.', 500)
    }
    return { clientId: paypalClientId, clientSecret: paypalClientSecret }
  }

  private getClient(): paypalSdk.core.PayPalHttpClient {
    const { clientId, clientSecret } = this.getCredentials()
    const environment =
      config.providers.paypalMode === 'live'
        ? new paypalSdk.core.LiveEnvironment(clientId, clientSecret)
        : new paypalSdk.core.SandboxEnvironment(clientId, clientSecret)
    return new paypalSdk.core.PayPalHttpClient(environment)
  }

  private get baseApiUrl(): string {
    return config.providers.paypalMode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  }

  private async getAccessToken(): Promise<string> {
    const { clientId, clientSecret } = this.getCredentials()
    const res = await fetch(`${this.baseApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new AppError(`PayPal token request failed: ${text}`, 502)
    }
    const data = (await res.json()) as { access_token: string }
    return data.access_token
  }

  async initiate(payload: {
    amount: number
    currency: string
    reference: string
    customerName: string
    customerEmail: string
    customerCountry: string
    metadata: Record<string, string>
  }): Promise<GatewayInitResult> {
    const client = this.getClient()
    const ref = encodeURIComponent(payload.reference)

    const request = new paypalSdk.orders.OrdersCreateRequest()
    request.prefer('return=representation')
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: payload.reference,
          description: 'LMS Subscription',
          amount: {
            currency_code: payload.currency,
            value: payload.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'LMS',
        return_url: `${config.frontendUrl}/payment/success?ref=${ref}`,
        cancel_url: `${config.frontendUrl}/payment/cancel?ref=${ref}`,
      },
    })

    const response = await client.execute<PayPalOrderResult>(request)
    const order = response.result
    const approveLink = order.links?.find((l) => l.rel === 'approve')?.href

    return {
      provider: 'paypal',
      providerPaymentId: order.id,
      status: order.status === 'COMPLETED' ? 'success' : 'pending',
      ...(approveLink ? { redirectUrl: approveLink } : {}),
    }
  }

  async verifyWebhook(
    rawBody: string,
    parsedBody: unknown,
    _signature: string | undefined,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult> {
    const webhookEvent: Record<string, unknown> =
      parsedBody != null && typeof parsedBody === 'object'
        ? (parsedBody as Record<string, unknown>)
        : (JSON.parse(rawBody) as Record<string, unknown>)

    // Verify signature via PayPal REST API if PAYPAL_WEBHOOK_ID is configured
    if (config.providers.paypalWebhookId) {
      const accessToken = await this.getAccessToken()
      const verifyRes = await fetch(
        `${this.baseApiUrl}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_algo: headers['paypal-auth-algo'],
            cert_url: headers['paypal-cert-url'],
            transmission_id: headers['paypal-transmission-id'],
            transmission_sig: headers['paypal-transmission-sig'],
            transmission_time: headers['paypal-transmission-time'],
            webhook_id: config.providers.paypalWebhookId,
            webhook_event: webhookEvent,
          }),
        },
      )
      if (!verifyRes.ok) {
        const text = await verifyRes.text()
        throw new AppError(
          `PayPal webhook verification API failed: ${text}`,
          502,
        )
      }
      const verifyData = (await verifyRes.json()) as {
        verification_status: string
      }
      if (verifyData.verification_status !== 'SUCCESS') {
        throw new AppError('PayPal webhook signature verification failed.', 400)
      }
    }

    const eventId =
      typeof webhookEvent['id'] === 'string'
        ? webhookEvent['id']
        : crypto.randomUUID()
    const eventType =
      typeof webhookEvent['event_type'] === 'string'
        ? webhookEvent['event_type']
        : ''
    const resource =
      webhookEvent['resource'] != null &&
      typeof webhookEvent['resource'] === 'object'
        ? (webhookEvent['resource'] as Record<string, unknown>)
        : undefined
    const resourceId =
      typeof resource?.['id'] === 'string' ? resource['id'] : undefined

    const purchaseUnits = Array.isArray(resource?.['purchase_units'])
      ? (resource['purchase_units'] as Array<{ reference_id?: string }>)
      : undefined
    const referenceId = purchaseUnits?.[0]?.reference_id

    let status: 'success' | 'failed' | 'pending' = 'pending'
    let finalProviderId = resourceId ?? eventId

    if (eventType === 'CHECKOUT.ORDER.APPROVED' && resourceId) {
      // Order is approved; capture it now
      const client = this.getClient()
      const captureReq = new paypalSdk.orders.OrdersCaptureRequest(resourceId)
      captureReq.requestBody({})
      const captureRes = await client.execute<PayPalOrderResult>(captureReq)
      const captured = captureRes.result
      status = captured.status === 'COMPLETED' ? 'success' : 'pending'
      finalProviderId = captured.id
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      // Payment was already captured; just confirm success
      status = 'success'
    } else if (
      eventType === 'PAYMENT.CAPTURE.DENIED' ||
      eventType === 'CHECKOUT.ORDER.VOIDED'
    ) {
      status = 'failed'
    }

    return {
      provider: 'paypal',
      eventId,
      providerPaymentId: finalProviderId,
      ...(referenceId ? { reference: referenceId } : {}),
      status,
      raw: webhookEvent,
    }
  }
}

// ---------------------------------------------------------------------------
// Gateway factory
// ---------------------------------------------------------------------------

export const resolveGatewayAdapter = (
  gateway: PaymentGateway,
): PaymentGatewayAdapter => {
  const gatewayConfig = paymentGatewayCountryConfig.find(
    (row) => row.gateway === gateway,
  )

  if (!gatewayConfig) {
    throw new AppError('Gateway is not configured.', 500)
  }

  if (gatewayConfig.provider === 'SSLCommerz') {
    if (gateway !== 'bkash' && gateway !== 'nagad') {
      throw new AppError('Invalid SSLCommerz gateway configuration.', 500)
    }

    return new SslCommerzBangladeshAdapter(gateway)
  }

  if (gatewayConfig.provider === 'Stripe') {
    return new StripeGatewayAdapter()
  }

  if (gatewayConfig.provider === 'PayPal') {
    return new PaypalGatewayAdapter()
  }

  throw new AppError('Unsupported payment gateway provider.', 500)
}

export const normalizeCountryCode = (countryCode: string | undefined) => {
  return countryCode?.trim().toUpperCase()
}

export const getAvailableGatewayConfigByCountry = (
  countryCode: string | undefined,
) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode)

  return paymentGatewayCountryConfig.filter((gatewayConfig) => {
    if (gatewayConfig.countries.includes('*')) {
      return true
    }

    if (!normalizedCountryCode) {
      return false
    }

    return gatewayConfig.countries.includes(normalizedCountryCode)
  })
}

export const getUserCountryCode = async (userId: string) => {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('User not found.', 404)
  }

  return {
    countryCode: normalizeCountryCode(user.countryCode),
    name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
    email: user.email,
  }
}

export const ensureGatewayAvailableForCountry = (
  gateway: PaymentGateway,
  countryCode: string | undefined,
) => {
  const availableConfig = getAvailableGatewayConfigByCountry(countryCode)
  const selectedConfig = availableConfig.find(
    (item) => item.gateway === gateway,
  )

  if (!selectedConfig) {
    throw new AppError(
      'Selected payment gateway is not available for your country.',
      400,
    )
  }

  return selectedConfig
}

export const toGatewayView = (countryCode: string | undefined) => {
  return getAvailableGatewayConfigByCountry(countryCode).map(
    (gatewayConfig) => ({
      gateway: gatewayConfig.gateway,
      provider: gatewayConfig.provider,
      countries: gatewayConfig.countries,
    }),
  )
}

export const resolveCustomerCountry = (
  countryCode: string | undefined,
): string => {
  return countryCode ?? 'UNKNOWN'
}

// ---------------------------------------------------------------------------
// Payment formatter
// ---------------------------------------------------------------------------

export const formatPayment = (payment: IPayment) => ({
  id: payment._id.toString(),
  userId: payment.userId.toString(),
  subscriptionId: payment.subscriptionId.toString(),
  provider: payment.provider,
  gateway: payment.gateway,
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  discountAmount: payment.discountAmount,
  payableAmount: payment.payableAmount,
  couponId: payment.couponId?.toString(),
  flashSaleId: payment.flashSaleId?.toString(),
  providerPaymentId: payment.providerPaymentId,
  gatewayTransactionId: payment.gatewayTransactionId,
  reference: payment.reference,
  metadata: payment.metadata,
  verifiedAt: payment.verifiedAt?.toISOString(),
  refundedAt: payment.refundedAt?.toISOString(),
  refundReason: payment.refundReason,
  createdAt: payment.createdAt.toISOString(),
  updatedAt: payment.updatedAt.toISOString(),
})

// ---------------------------------------------------------------------------
// Internal transaction helpers
// ---------------------------------------------------------------------------

export const findPaymentForVerification = async (
  verification: PaymentVerificationInput,
  session?: ClientSession,
) => {
  const criteria: Record<string, unknown>[] = [
    { reference: verification.reference },
  ]
  if (verification.providerPaymentId) {
    criteria.push({ providerPaymentId: verification.providerPaymentId })
  }
  if (verification.gatewayTransactionId) {
    criteria.push({ gatewayTransactionId: verification.gatewayTransactionId })
  }
  const query = PaymentModel.findOne({ $or: criteria })
  if (session) query.session(session)
  return query
}

export const applyVerificationTransaction = async (
  verification: PaymentVerificationInput,
  session: ClientSession,
) => {
  const payment = await findPaymentForVerification(verification, session)

  if (!payment) {
    throw new AppError('Payment not found for verification.', 404)
  }
  if (payment.status === 'refunded') {
    throw new AppError('Refunded payment cannot be verified again.', 400)
  }
  if (payment.status === 'success') {
    return payment
  }

  payment.status =
    verification.status === 'success' ? 'success' : verification.status
  payment.providerPaymentId =
    verification.providerPaymentId ?? payment.providerPaymentId
  payment.gatewayTransactionId =
    verification.gatewayTransactionId ?? payment.gatewayTransactionId

  if (payment.status === 'success') {
    payment.verifiedAt = new Date()
  }

  await payment.save({ session })

  if (payment.status === 'success') {
    await subscriptionsService.activateSubscriptionFromPayment(
      {
        subscriptionId: payment.subscriptionId.toString(),
        paymentId: payment._id.toString(),
        userId: payment.userId.toString(),
      },
      session,
    )

    if (payment.couponId && payment.discountAmount > 0) {
      await promotionsService.markCouponUsed(
        {
          couponId: payment.couponId.toString(),
          userId: payment.userId.toString(),
          paymentId: payment._id.toString(),
          amount: payment.discountAmount,
        },
        session,
      )
    }
  }

  return payment
}
