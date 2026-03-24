import { Router } from 'express'
import passport from 'passport'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { authController } from './controller'
import { ensureFacebookConfigured, ensureGoogleConfigured } from './utils'
import { authValidation } from './validation'

const router = Router()

router.post(
  '/register',
  validateRequest({ body: authValidation.registerBody }),
  authController.register,
)
router.post(
  '/login',
  validateRequest({ body: authValidation.loginBody }),
  authController.login,
)
router.post(
  '/2fa/challenge',
  validateRequest({ body: authValidation.twoFactorChallengeBody }),
  authController.challengeTwoFactor,
)
router.post(
  '/2fa/email/send',
  validateRequest({ body: authValidation.sendEmailOtpBody }),
  authController.sendUserEmailOtp,
)

router.get(
  '/google',
  (_request, _response, next) => {
    ensureGoogleConfigured()
    next()
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
)
router.get(
  '/google/callback',
  (_request, _response, next) => {
    ensureGoogleConfigured()
    next()
  },
  passport.authenticate('google', {
    session: false,
    failWithError: true,
  }),
  authController.socialCallback,
)

router.get(
  '/facebook',
  (_request, _response, next) => {
    ensureFacebookConfigured()
    next()
  },
  passport.authenticate('facebook', {
    scope: ['email'],
    session: false,
  }),
)
router.get(
  '/facebook/callback',
  (_request, _response, next) => {
    ensureFacebookConfigured()
    next()
  },
  passport.authenticate('facebook', {
    session: false,
    failWithError: true,
  }),
  authController.socialCallback,
)

router.post('/logout', authController.logout)
router.post('/refresh', authController.refreshSession)
router.post(
  '/verify-email',
  validateRequest({ body: authValidation.verifyEmailBody }),
  authController.verifyEmail,
)
router.post(
  '/resend-verification',
  validateRequest({ body: authValidation.resendVerificationBody }),
  authController.resendVerification,
)
router.post(
  '/forgot-password',
  validateRequest({ body: authValidation.forgotPasswordBody }),
  authController.forgotPassword,
)
router.post(
  '/resend-reset-otp',
  validateRequest({ body: authValidation.resendResetOtpBody }),
  authController.resendResetOtp,
)
router.post(
  '/verify-reset-otp',
  validateRequest({ body: authValidation.verifyResetOtpBody }),
  authController.verifyResetOtp,
)
router.post(
  '/reset-password',
  validateRequest({ body: authValidation.resetPasswordBody }),
  authController.resetPassword,
)

router.get('/me', authenticateUser, authController.getMe)
router.post('/2fa/enable', authenticateUser, authController.enableTwoFactor)
router.post(
  '/2fa/verify',
  authenticateUser,
  validateRequest({ body: authValidation.twoFactorVerifyBody }),
  authController.verifyTwoFactor,
)
router.post(
  '/2fa/disable',
  authenticateUser,
  validateRequest({ body: authValidation.twoFactorDisableBody }),
  authController.disableTwoFactor,
)
router.get(
  '/2fa/backup-codes',
  authenticateUser,
  validateRequest({ query: authValidation.twoFactorBackupCodesQuery }),
  authController.getBackupCodesCount,
)
router.get(
  '/me/login-history',
  authenticateUser,
  authController.getMyLoginHistory,
)
router.patch(
  '/me',
  authenticateUser,
  validateRequest({ body: authValidation.updateMeBody }),
  authController.updateMe,
)
router.patch(
  '/me/password',
  authenticateUser,
  validateRequest({ body: authValidation.changePasswordBody }),
  authController.changeMyPassword,
)
router.patch(
  '/me/notification-prefs',
  authenticateUser,
  validateRequest({ body: authValidation.updateNotificationPreferencesBody }),
  authController.updateMyNotificationPreferences,
)

export const authRouter = router
