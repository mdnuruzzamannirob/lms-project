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

const confirmPayment: RequestHandler = catchAsync(async (request, response) => {
  const data = await onboardingService.confirmPayment(
    getAuthenticatedUserId(request),
    request.body.sessionId,
    request.body.reference,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Onboarding payment confirmation checked successfully.',
    data,
  })
})

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

const storeInterests: RequestHandler = catchAsync(async (request, response) => {
  const data = await onboardingService.storeInterests(
    getAuthenticatedUserId(request),
    request.body.interests,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Interests stored successfully.',
    data,
  })
})

const storeLanguage: RequestHandler = catchAsync(async (request, response) => {
  const data = await onboardingService.storeLanguage(
    getAuthenticatedUserId(request),
    request.body.language,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Language preference stored successfully.',
    data,
  })
})

export const onboardingController = {
  getPlanOptions,
  selectPlan,
  completeOnboarding,
  confirmPayment,
  getMyOnboardingStatus,
  storeInterests,
  storeLanguage,
}
