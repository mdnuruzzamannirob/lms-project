import { z } from 'zod'

import { idParamSchema } from '../../common/validators/common'

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format')

const gatewaySchema = z.enum(['bkash', 'nagad', 'stripe', 'paypal'])
const billingCycleSchema = z.enum(['monthly', 'yearly']).default('monthly')

export const paymentsValidation = {
  idParam: idParamSchema,
  initiateBody: z.object({
    userId: objectIdString.optional(),
    planId: objectIdString,
    gateway: gatewaySchema,
    couponCode: z.string().trim().min(2).max(40).toUpperCase().optional(),
    billingCycle: billingCycleSchema,
    autoRenew: z.boolean().default(true),
  }),
  paymentMethodPortalBody: z.object({
    returnUrl: z.string().trim().url().optional(),
  }),
  verifyBody: z.object({
    reference: z.string().trim().min(8).max(120),
    providerPaymentId: z.string().trim().min(2).max(200).optional(),
    gatewayTransactionId: z.string().trim().min(2).max(200).optional(),
    status: z.enum(['success', 'failed', 'pending']),
  }),
  confirmStripeSessionBody: z.object({
    sessionId: z.string().trim().min(3).max(200),
    reference: z.string().trim().min(8).max(120).optional(),
  }),
  refundBody: z.object({
    reason: z.string().trim().min(3).max(200),
  }),
  webhookParams: z.object({
    gateway: gatewaySchema,
  }),
  // Webhook bodies are validated per-adapter (SSLCommerz IPN, Stripe Event, PayPal Event);
  // body schema enforcement is skipped on the route — adapters own this responsibility.
  webhookBody: z.record(z.unknown()),
}
