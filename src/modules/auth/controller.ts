import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import {
  extractBearerToken,
  getCookieValueFromHeader,
  setUserRefreshCookie,
  setUserSessionCookie,
} from '../../common/utils/token'
import { USER_REFRESH_COOKIE_NAME } from './constants'
import { authService } from './service'
import { ensureAuthenticatedUser } from './utils'

const register: RequestHandler = catchAsync(async (request, response) => {
  const result = await authService.register(request.body)

  setUserSessionCookie(response, result.tokens.accessToken)
  setUserRefreshCookie(response, result.tokens.refreshToken)

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'User registered successfully.',
    data: result,
  })
})

const login: RequestHandler = catchAsync(async (request, response) => {
  const result = await authService.login(request.body, request)

  if (!result.requiresTwoFactor) {
    setUserSessionCookie(response, result.accessToken)
    setUserRefreshCookie(response, result.refreshToken)
  }

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: result.requiresTwoFactor
      ? '2FA challenge required to complete login.'
      : 'User login successful.',
    data: result,
  })
})

const enableTwoFactor: RequestHandler = catchAsync(
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

const verifyTwoFactor: RequestHandler = catchAsync(
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

const disableTwoFactor: RequestHandler = catchAsync(
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

const challengeTwoFactor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.challengeTwoFactor(request.body)

    setUserSessionCookie(response, data.accessToken)
    setUserRefreshCookie(response, data.refreshToken)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: '2FA challenge completed successfully.',
      data,
    })
  },
)

const getBackupCodesCount: RequestHandler = catchAsync(
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

const socialCallback: RequestHandler = catchAsync(async (request, response) => {
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
})

const logout: RequestHandler = catchAsync(async (_request, response) => {
  await authService.logout(response)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'User logout successful.',
    data: null,
  })
})

const verifyEmail: RequestHandler = catchAsync(async (request, response) => {
  await authService.verifyEmail(request.body.token)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Email verified successfully.',
    data: null,
  })
})

const resendVerification: RequestHandler = catchAsync(
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

const forgotPassword: RequestHandler = catchAsync(async (request, response) => {
  const data = await authService.forgotPassword(request.body.email)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Password reset instructions sent if account exists.',
    data,
  })
})

const resendResetOtp: RequestHandler = catchAsync(async (request, response) => {
  const data = await authService.resendResetOtp(request.body.email)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Password reset code sent if account exists.',
    data,
  })
})

const verifyResetOtp: RequestHandler = catchAsync(async (request, response) => {
  const data = await authService.verifyResetOtp(
    request.body.email,
    request.body.otp,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Reset code verified successfully.',
    data,
  })
})

const resetPassword: RequestHandler = catchAsync(async (request, response) => {
  const data = await authService.resetPassword(
    request.body.resetToken,
    request.body.newPassword,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Password has been reset successfully.',
    data,
  })
})

const refreshSession: RequestHandler = catchAsync(async (request, response) => {
  const refreshToken =
    getCookieValueFromHeader(
      request.header('cookie'),
      USER_REFRESH_COOKIE_NAME,
    ) ?? extractBearerToken(request.header('authorization'))

  if (!refreshToken) {
    throw new AppError('Unauthorized. Refresh token is required.', 401)
  }

  const tokens = await authService.refreshSession(refreshToken)

  setUserSessionCookie(response, tokens.accessToken)
  setUserRefreshCookie(response, tokens.refreshToken)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Session refreshed successfully.',
    data: { accessToken: tokens.accessToken },
  })
})

const sendUserEmailOtp: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authService.sendUserEmailOtp(request.body.tempToken)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Email OTP sent successfully.',
      data,
    })
  },
)

const getMe: RequestHandler = catchAsync(async (request, response) => {
  const user = await authService.getMe(ensureAuthenticatedUser(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Profile retrieved successfully.',
    data: user,
  })
})

const getMyLoginHistory: RequestHandler = catchAsync(
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

const updateMe: RequestHandler = catchAsync(async (request, response) => {
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
})

const changeMyPassword: RequestHandler = catchAsync(
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

const updateMyNotificationPreferences: RequestHandler = catchAsync(
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

export const authController = {
  register,
  login,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  challengeTwoFactor,
  getBackupCodesCount,
  socialCallback,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,
  refreshSession,
  sendUserEmailOtp,
  getMe,
  getMyLoginHistory,
  updateMe,
  changeMyPassword,
  updateMyNotificationPreferences,
}
