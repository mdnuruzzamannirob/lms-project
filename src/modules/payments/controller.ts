import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { getUserId } from '../../common/utils/getId'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { paymentsService } from './service'
import { getGatewayParam } from './utils'

export const listMyPayments: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.listMyPayments(getUserId(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'My payments retrieved successfully.',
      data,
    })
  },
)

export const listAvailablePaymentGateways: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.listAvailablePaymentGatewaysForUser(
      getUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Available payment gateways retrieved successfully.',
      data,
    })
  },
)

export const getMyPaymentById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.getMyPaymentById(
      getUserId(request),
      getIdParam(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Payment retrieved successfully.',
      data,
    })
  },
)

export const getMyPaymentMethod: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.getMyPaymentMethodSummary(
      getUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Payment method retrieved successfully.',
      data,
    })
  },
)

export const createMyPaymentMethodPortalSession: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.createMyPaymentMethodPortalSession(
      getUserId(request),
      {
        returnUrl: request.body.returnUrl,
      },
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Billing portal session created successfully.',
      data,
    })
  },
)

export const listPayments: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await paymentsService.listPayments()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Payments retrieved successfully.',
      data,
    })
  },
)

export const getPaymentById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.getPaymentById(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Payment retrieved successfully.',
      data,
    })
  },
)

export const initiatePayment: RequestHandler = catchAsync(
  async (request, response) => {
    const authUserId = getUserId(request)
    const bodyUserId: unknown = request.body.userId

    if (
      typeof bodyUserId === 'string' &&
      bodyUserId.trim() !== '' &&
      bodyUserId !== authUserId
    ) {
      throw new AppError('Body userId must match the authenticated user.', 400)
    }

    const data = await paymentsService.initiatePayment({
      userId: typeof bodyUserId === 'string' ? bodyUserId : authUserId,
      planId: request.body.planId,
      gateway: request.body.gateway,
      couponCode: request.body.couponCode,
      billingCycle: request.body.billingCycle,
      autoRenew: request.body.autoRenew,
    })

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Payment initiated successfully.',
      data,
    })
  },
)

export const verifyPayment: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.verifyPayment(request.body)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Payment verified successfully.',
      data,
    })
  },
)

export const confirmStripeCheckoutSession: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.confirmStripeCheckoutSessionForUser({
      userId: getUserId(request),
      sessionId: request.body.sessionId,
      reference: request.body.reference,
    })

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Stripe checkout session confirmed successfully.',
      data,
    })
  },
)

export const refundPayment: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await paymentsService.refundPayment(
      getIdParam(request),
      request.body.reason,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Payment refunded successfully.',
      data,
    })
  },
)

export const handleWebhook: RequestHandler = catchAsync(
  async (request, response) => {
    const gateway = getGatewayParam(request)

    // For Stripe: rawBody is the exact bytes captured by express.json()'s verify
    // callback, required for stripe.webhooks.constructEvent(). For all other
    // gateways the parsed body (request.body) is used directly.
    const stripeRawBody =
      gateway === 'stripe' && Buffer.isBuffer(request.body)
        ? request.body
        : undefined
    const rawBody =
      stripeRawBody ??
      request.rawBody?.toString('utf8') ??
      JSON.stringify(request.body ?? {})
    const parsedBody: unknown = request.body

    // Use the gateway-specific signature header.
    const signatureHeader =
      gateway === 'stripe'
        ? request.header('stripe-signature')
        : request.header('x-signature')

    // Collect all request headers to support PayPal webhook verification
    // (requires paypal-auth-algo, paypal-cert-url, paypal-transmission-* headers).
    const headers: Record<string, string | string[] | undefined> = {
      ...request.headers,
    }

    const data = await paymentsService.processWebhook(
      gateway,
      rawBody,
      parsedBody,
      signatureHeader ?? undefined,
      headers,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Webhook processed successfully.',
      data,
    })
  },
)

export const paymentsController = {
  listMyPayments,
  listAvailablePaymentGateways,
  getMyPaymentById,
  getMyPaymentMethod,
  createMyPaymentMethodPortalSession,
  listPayments,
  getPaymentById,
  initiatePayment,
  verifyPayment,
  confirmStripeCheckoutSession,
  refundPayment,
  handleWebhook,
}
