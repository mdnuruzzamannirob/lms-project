import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { onboardingService } from './service'

const getAuthenticatedUserId = (
  request: Parameters<RequestHandler>[0],
): string => {
  if (!request.auth || request.auth.type !== 'user') {
    throw new AppError('User authentication is required.', 401)
  }

  return request.auth.sub
}

export const getPlanOptions: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await onboardingService.getPlanOptions()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Onboarding plans retrieved successfully.',
      data,
    })
  },
)

export const selectPlan: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await onboardingService.selectPlan(
      getAuthenticatedUserId(request),
      request.body.planCode,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Onboarding plan selected successfully.',
      data,
    })
  },
)

export const completeOnboarding: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await onboardingService.completeOnboarding(
      getAuthenticatedUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Onboarding completed successfully.',
      data,
    })
  },
)

export const getMyOnboardingStatus: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await onboardingService.getOnboardingStatus(
      getAuthenticatedUserId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Onboarding status retrieved successfully.',
      data,
    })
  },
)
