import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import {
  extractBearerToken,
  getCookieValueFromHeader,
  setStaffRefreshCookie,
  setStaffSessionCookie,
} from '../../common/utils/token'
import { staffAuthService } from './service'

const STAFF_REFRESH_COOKIE_NAME = 'stackread_staff_refresh'

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
      message: data.mustSetup2FA
        ? '2FA setup is required before access.'
        : '2FA verification is required.',
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
      message: data.message,
      data,
    })
  },
)

export const staffLogout: RequestHandler = catchAsync(
  async (_request, response) => {
    await staffAuthService.logout(response)

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
      request.auth.sub,
      request.body,
    )

    setStaffSessionCookie(response, data.token)
    setStaffRefreshCookie(response, data.refreshToken)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA enabled successfully.',
      data,
    })
  },
)

export const setupTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.setupTwoFactor(request.auth.sub)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA setup secret generated successfully.',
      data,
    })
  },
)

export const verifyTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.verifyTwoFactor(
      request.auth.sub,
      request.body,
    )

    setStaffSessionCookie(response, data.token)
    setStaffRefreshCookie(response, data.refreshToken)

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
    const data = await staffAuthService.disableTwoFactor()

    sendResponse(response, {
      statusCode: 403,
      success: false,
      message: 'Staff 2FA cannot be disabled. Contact admin to reset.',
      data,
    })
  },
)

export const sendStaffEmailOtp: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.sendStaffEmailOtp(request.auth.sub)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Email OTP sent successfully.',
      data,
    })
  },
)

export const forgotStaffPassword: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.forgotStaffPassword(request.body.email)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Password reset instructions sent if account exists.',
      data,
    })
  },
)

export const resendStaffResetOtp: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.resendStaffResetOtp(request.body.email)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Password reset code sent if account exists.',
      data,
    })
  },
)

export const verifyStaffResetOtp: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.verifyStaffResetOtp(
      request.body.email,
      request.body.otp,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Reset code verified successfully.',
      data,
    })
  },
)

export const resetStaffPassword: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffAuthService.resetStaffPassword(
      request.body.resetToken,
      request.body.newPassword,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Password has been reset successfully.',
      data,
    })
  },
)

export const refreshStaffSession: RequestHandler = catchAsync(
  async (request, response) => {
    const refreshToken =
      getCookieValueFromHeader(
        request.header('cookie'),
        STAFF_REFRESH_COOKIE_NAME,
      ) ?? extractBearerToken(request.header('authorization'))

    if (!refreshToken) {
      throw new AppError('Unauthorized. Refresh token is required.', 401)
    }

    const tokens = await staffAuthService.refreshSession(refreshToken)

    setStaffSessionCookie(response, tokens.accessToken)
    setStaffRefreshCookie(response, tokens.refreshToken)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Session refreshed successfully.',
      data: { accessToken: tokens.accessToken },
    })
  },
)
