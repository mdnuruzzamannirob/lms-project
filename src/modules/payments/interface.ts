import type { Types } from 'mongoose'

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
