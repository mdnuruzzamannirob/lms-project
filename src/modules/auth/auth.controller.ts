import { NextFunction, Request, Response } from 'express'
import {
  sendCreated,
  sendError,
  sendPaginated,
  sendSuccess,
} from '../../utils/response'
import * as AuthService from './auth.service'

// POST /auth/register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await AuthService.register(req.body, req)
    sendCreated(
      res,
      result,
      'Registration successful. Please verify your email.',
    )
  } catch (err) {
    next(err)
  }
}

// POST /auth/login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await AuthService.login(req.body, req)
    sendSuccess(res, result, 'Login successful.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/google
export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await AuthService.googleAuth(
      req.body.id_token as string,
      req,
    )
    sendSuccess(res, result, 'Google login successful.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/facebook
export const facebookAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await AuthService.facebookAuth(
      req.body.access_token as string,
      req,
    )
    sendSuccess(res, result, 'Facebook login successful.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/logout
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuthService.logout(req.user!._id)
    sendSuccess(res, null, 'Logged out successfully.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/verify-email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuthService.verifyEmail(req.body.token as string)
    sendSuccess(res, null, 'Email verified successfully.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/resend-verification
export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuthService.resendVerification(req.user!)
    sendSuccess(res, null, 'Verification email sent.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/forgot-password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuthService.forgotPassword(req.body.email as string, req.ip)
    sendSuccess(
      res,
      null,
      'If that email is registered, a reset link has been sent.',
    )
  } catch (err) {
    next(err)
  }
}

// POST /auth/reset-password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuthService.resetPassword(
      req.body.token as string,
      req.body.password as string,
    )
    sendSuccess(
      res,
      null,
      'Password reset successfully. Please log in with your new password.',
    )
  } catch (err) {
    next(err)
  }
}

// GET /auth/me
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await AuthService.getMe(req.user!._id)
    sendSuccess(res, user)
  } catch (err) {
    next(err)
  }
}

// PATCH /auth/me
export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const allowed = [
      'name',
      'avatar_url',
      'language',
      'birthday',
      'timezone',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (!Object.keys(updates).length) {
      sendError(res, 'No valid fields to update.', 400)
      return
    }

    const user = await AuthService.updateProfile(
      req.user!._id,
      updates as never,
    )
    sendSuccess(res, user, 'Profile updated.')
  } catch (err) {
    next(err)
  }
}

// PATCH /auth/me/password
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await AuthService.changePassword(
      req.user!._id,
      req.body.current_password,
      req.body.new_password,
    )
    sendSuccess(res, null, 'Password changed. Please log in again.')
  } catch (err) {
    next(err)
  }
}

// PATCH /auth/me/notification-prefs
export const updateNotificationPrefs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, sms, in_app, push } = req.body as Record<
      string,
      boolean | undefined
    >
    if (
      email === undefined &&
      sms === undefined &&
      in_app === undefined &&
      push === undefined
    ) {
      sendError(res, 'No preference fields provided.', 400)
      return
    }
    const prefs = await AuthService.updateNotificationPrefs(req.user!._id, {
      email,
      sms,
      in_app,
      push,
    })
    sendSuccess(
      res,
      { notification_prefs: prefs },
      'Notification preferences updated.',
    )
  } catch (err) {
    next(err)
  }
}

// GET /auth/me/login-history
export const getLoginHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1)
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100)
    const { records, total } = await AuthService.getLoginHistory(
      req.user!._id,
      page,
      limit,
    )
    sendPaginated(res, records, { page, limit, total })
  } catch (err) {
    next(err)
  }
}
