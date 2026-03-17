import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { staffAuthService } from './service'

const getStaffIdFromAuth = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth.sub
}

export const staffLogin: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.login(request.body, request)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: data.requiresTwoFactor
        ? '2FA verification is required.'
        : 'Staff login successful.',
      data,
    })
  },
)

export const acceptInvite: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.acceptInvite(request.body)

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Staff invitation accepted successfully.',
      data,
    })
  },
)

export const staffLogout: RequestHandler = catchAsync(
  async (_request, response) => {
    await staffAuthService.logout()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff logout successful.',
      data: null,
    })
  },
)

export const getStaffMe: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.getMyProfile(
      getStaffIdFromAuth(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff profile retrieved successfully.',
      data,
    })
  },
)

export const changeStaffPassword: RequestHandler = catchAsync(
  async (request, response) => {
    await staffAuthService.changeMyPassword(
      getStaffIdFromAuth(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff password changed successfully.',
      data: null,
    })
  },
)

export const enableTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.enableTwoFactor(
      getStaffIdFromAuth(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA secret generated successfully.',
      data,
    })
  },
)

export const verifyTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.verifyTwoFactor(
      getStaffIdFromAuth(request),
      request.body.code,
      request,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA verified successfully.',
      data,
    })
  },
)

export const disableTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.disableTwoFactor(
      getStaffIdFromAuth(request),
      request.body,
      request,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA disabled successfully.',
      data,
    })
  },
)
