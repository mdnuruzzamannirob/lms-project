import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { authService } from './service'

const ensureAuthenticatedUser = (
  request: Parameters<RequestHandler>[0],
): string => {
  const userId = request.auth?.sub

  if (!userId || request.auth?.type !== 'user') {
    throw new AppError('Unauthorized user access.', 401)
  }

  return userId
}

export const register: RequestHandler = catchAsync(
  async (request, response) => {
    const result = await authService.register(request.body)

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'User registered successfully.',
      data: result,
    })
  },
)

export const login: RequestHandler = catchAsync(async (request, response) => {
  const result = await authService.login(request.body, request)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: result.requiresTwoFactor
      ? '2FA challenge required to complete login.'
      : 'User login successful.',
    data: result,
  })
})

export const enableTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.enableTwoFactor(
      ensureAuthenticatedUser(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA setup generated successfully.',
      data,
    })
  },
)

export const verifyTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.verifyTwoFactor(
      ensureAuthenticatedUser(request),
      request.body.otp,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA enabled successfully.',
      data,
    })
  },
)

export const disableTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.disableTwoFactor(
      ensureAuthenticatedUser(request),
      request.body.otp,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA disabled successfully.',
      data,
    })
  },
)

export const challengeTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.challengeTwoFactor(request.body)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA challenge completed successfully.',
      data,
    })
  },
)

export const getBackupCodesCount: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.getBackupCodesCount(
      ensureAuthenticatedUser(request),
      String(request.query.otp),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Backup codes count fetched successfully.',
      data,
    })
  },
)

export const socialCallback: RequestHandler = catchAsync(
  async (request, response) => {
    const profile = request.user as
      | {
          provider: 'google' | 'facebook'
          providerId: string
          email: string
          name: string
        }
      | undefined

    if (!profile) {
      throw new AppError('Social authentication failed.', 401)
    }

    const result = await authService.socialLogin(profile, request)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Social login successful.',
      data: result,
    })
  },
)

export const logout: RequestHandler = catchAsync(async (_request, response) => {
  await authService.logout()

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'User logout successful.',
    data: null,
  })
})

export const verifyEmail: RequestHandler = catchAsync(
  async (request, response) => {
    await authService.verifyEmail(request.body.token)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Email verified successfully.',
      data: null,
    })
  },
)

export const resendVerification: RequestHandler = catchAsync(
  async (request, response) => {
    await authService.resendVerification(request.body.email)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Verification email sent if account exists.',
      data: null,
    })
  },
)

export const forgotPassword: RequestHandler = catchAsync(
  async (request, response) => {
    await authService.forgotPassword(request.body.email)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Password reset instructions sent if account exists.',
      data: null,
    })
  },
)

export const resetPassword: RequestHandler = catchAsync(
  async (request, response) => {
    await authService.resetPassword(
      request.body.token,
      request.body.newPassword,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Password has been reset successfully.',
      data: null,
    })
  },
)

export const getMe: RequestHandler = catchAsync(async (request, response) => {
  const user = await authService.getMe(ensureAuthenticatedUser(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Profile retrieved successfully.',
    data: user,
  })
})

export const getMyLoginHistory: RequestHandler = catchAsync(
  async (request, response) => {
    const history = await authService.getMyLoginHistory(
      ensureAuthenticatedUser(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Login history retrieved successfully.',
      data: history,
    })
  },
)

export const updateMe: RequestHandler = catchAsync(
  async (request, response) => {
    const user = await authService.updateMe(
      ensureAuthenticatedUser(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    })
  },
)

export const changeMyPassword: RequestHandler = catchAsync(
  async (request, response) => {
    await authService.changePassword(
      ensureAuthenticatedUser(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Password changed successfully.',
      data: null,
    })
  },
)

export const updateMyNotificationPreferences: RequestHandler = catchAsync(
  async (request, response) => {
    const user = await authService.updateNotificationPreferences(
      ensureAuthenticatedUser(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Notification preferences updated successfully.',
      data: user,
    })
  },
)
