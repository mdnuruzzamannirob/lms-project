import type { Types } from 'mongoose'

import type { PlanBillingCycle } from '../plans/interface'

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'success'
  | 'failed'
  | 'refunded'

export type PaymentGateway = 'bkash' | 'nagad' | 'stripe' | 'paypal'

export type WebhookProcessingStatus =
  | 'received'
  | 'processed'
  | 'ignored'
  | 'failed'

export interface IPayment {
  _id: Types.ObjectId
  userId: Types.ObjectId
  subscriptionId: Types.ObjectId
  provider: string
  gateway: PaymentGateway
  status: PaymentStatus
  amount: number
  currency: string
  discountAmount: number
  payableAmount: number
  couponId: Types.ObjectId | undefined
  flashSaleId: Types.ObjectId | undefined
  providerPaymentId: string | undefined
  gatewayTransactionId: string | undefined
  reference: string
  metadata: Record<string, unknown>
  verifiedAt: Date | undefined
  refundedAt: Date | undefined
  refundReason: string | undefined
  createdAt: Date
  updatedAt: Date
}

export interface IWebhookLog {
  _id: Types.ObjectId
  provider: string
  gateway: PaymentGateway
  eventId: string
  signature: string | undefined
  payload: string
  processingStatus: WebhookProcessingStatus
  processedPaymentId: Types.ObjectId | undefined
  errorMessage: string | undefined
  createdAt: Date
  updatedAt: Date
}

export interface PaymentVerificationInput {
  reference: string
  providerPaymentId?: string
  gatewayTransactionId?: string
  status: 'success' | 'failed' | 'pending'
  metadata?: Record<string, unknown>
}

export interface InitiatePaymentPayload {
  userId: string
  planId: string
  gateway: PaymentGateway
  couponCode?: string
  billingCycle?: PlanBillingCycle
  autoRenew?: boolean
  successUrl?: string
  cancelUrl?: string
}

export interface GatewayInitiatePayload {
  amount: number
  currency: string
  reference: string
  customerName: string
  customerEmail: string
  customerCountry: string
  metadata: Record<string, string>
  billingCycle?: PlanBillingCycle
  stripePriceId?: string
  successUrl?: string
  cancelUrl?: string
}

export interface GatewayInitResult {
  provider: string
  providerPaymentId: string
  status: 'pending' | 'success'
  redirectUrl?: string
  clientSecret?: string
}

export interface WebhookVerificationResult {
  provider: string
  eventId: string
  providerPaymentId: string
  reference?: string
  status: 'success' | 'failed' | 'pending'
  eventType?: string
  raw: unknown
}

export interface PaymentGatewayAdapter {
  readonly gateway: PaymentGateway
  initiate(payload: GatewayInitiatePayload): Promise<GatewayInitResult>
  verifyWebhook(
    rawBody: string | Buffer,
    parsedBody: unknown,
    signature: string | undefined,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult>
}

export interface PayPalOrderResult {
  id: string
  status: string
  links?: Array<{ rel: string; href: string }>
  purchase_units?: Array<{ reference_id?: string }>
}

export interface PaymentMethodSummary {
  gateway: PaymentGateway | 'none'
  label: string
  status: 'ok' | 'expired' | 'missing'
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  holderName?: string
  expiresAt?: string
}

export interface PaymentMethodPortalSessionPayload {
  returnUrl?: string
}

export interface PaymentMethodPortalSessionResult {
  url: string
}
