import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { onboardingService } from './service'
import { getAuthenticatedUserId } from './utils'

const getPlanOptions: RequestHandler = catchAsync(async (request, response) => {
  const data = await onboardingService.getPlanOptions(
    getAuthenticatedUserId(request),
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Onboarding plans retrieved successfully.',
    data,
  })
})

const selectPlan: RequestHandler = catchAsync(async (request, response) => {
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
})

const completeOnboarding: RequestHandler = catchAsync(
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

const getMyOnboardingStatus: RequestHandler = catchAsync(
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

export const onboardingController = {
  getPlanOptions,
  selectPlan,
  completeOnboarding,
  getMyOnboardingStatus,
}
