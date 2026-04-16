import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getUserId } from '../../common/utils/getId'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { subscriptionsService } from './service'

const getMyCurrentSubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.getMyCurrentSubscription(
      getUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Current subscription retrieved successfully.',
      data,
    })
  },
)

const getMySubscriptionHistory: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.getMySubscriptionHistory(
      getUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription history retrieved successfully.',
      data,
    })
  },
)

const listSubscriptions: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await subscriptionsService.listSubscriptions()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscriptions retrieved successfully.',
      data,
    })
  },
)

const getSubscriptionById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.getSubscriptionById(
      getIdParam(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription retrieved successfully.',
      data,
    })
  },
)

const createSubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.createSubscription(request.body)

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Subscription created successfully.',
      data,
    })
  },
)

const cancelMySubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.cancelMySubscription(
      getUserId(request),
      request.body.reason,
      request.body.immediate,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription cancelled successfully.',
      data,
    })
  },
)

const renewMySubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.renewMySubscription(
      getUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription renewed successfully.',
      data,
    })
  },
)

const retryMySubscriptionPayment: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.retryMyStripeInvoicePayment(
      getUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription payment retry started successfully.',
      data,
    })
  },
)

const upgradeMySubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.changePlanWithTransaction({
      userId: getUserId(request),
      newPlanId: request.body.newPlanId,
      mode: 'upgrade',
    })

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription upgrade started successfully.',
      data,
    })
  },
)

const downgradeMySubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.changePlanWithTransaction({
      userId: getUserId(request),
      newPlanId: request.body.newPlanId,
      mode: 'downgrade',
    })

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription downgrade started successfully.',
      data,
    })
  },
)

const adminUpdateSubscription: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await subscriptionsService.adminUpdateSubscription(
      getIdParam(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Subscription updated successfully.',
      data,
    })
  },
)

export const subscriptionsController = {
  getMyCurrentSubscription,
  getMySubscriptionHistory,
  listSubscriptions,
  getSubscriptionById,
  createSubscription,
  cancelMySubscription,
  renewMySubscription,
  retryMySubscriptionPayment,
  upgradeMySubscription,
  downgradeMySubscription,
  adminUpdateSubscription,
}
