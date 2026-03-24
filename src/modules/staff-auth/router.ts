import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { authenticateTempToken } from '../../common/middlewares/authenticateTempToken'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { staffAuthController } from './controller'
import { staffAuthValidation } from './validation'

const router = Router()

router.post(
  '/login',
  validateRequest({ body: staffAuthValidation.loginBody }),
  staffAuthController.staffLogin,
)
router.post(
  '/accept-invite',
  validateRequest({ body: staffAuthValidation.acceptInviteBody }),
  staffAuthController.acceptInvite,
)
router.post(
  '/forgot-password',
  validateRequest({ body: staffAuthValidation.forgotPasswordBody }),
  staffAuthController.forgotStaffPassword,
)
router.post(
  '/resend-reset-otp',
  validateRequest({ body: staffAuthValidation.resendResetOtpBody }),
  staffAuthController.resendStaffResetOtp,
)
router.post(
  '/verify-reset-otp',
  validateRequest({ body: staffAuthValidation.verifyResetOtpBody }),
  staffAuthController.verifyStaffResetOtp,
)
router.post(
  '/reset-password',
  validateRequest({ body: staffAuthValidation.resetPasswordBody }),
  staffAuthController.resetStaffPassword,
)
router.post('/logout', authenticateStaff, staffAuthController.staffLogout)
router.post('/refresh', staffAuthController.refreshStaffSession)
router.get('/me', authenticateStaff, staffAuthController.getStaffMe)
router.patch(
  '/me/password',
  authenticateStaff,
  validateRequest({ body: staffAuthValidation.changePasswordBody }),
  staffAuthController.changeStaffPassword,
)
router.post(
  '/2fa/setup',
  authenticateTempToken,
  staffAuthController.setupTwoFactor,
)
router.post(
  '/2fa/enable',
  authenticateTempToken,
  validateRequest({ body: staffAuthValidation.staffTwoFactorEnableBody }),
  staffAuthController.enableTwoFactor,
)
router.post(
  '/2fa/verify',
  authenticateTempToken,
  validateRequest({ body: staffAuthValidation.staffTwoFactorVerifyBody }),
  staffAuthController.verifyTwoFactor,
)
router.post(
  '/2fa/email/send',
  authenticateTempToken,
  staffAuthController.sendStaffEmailOtp,
)
router.post(
  '/2fa/disable',
  authenticateStaff,
  validateRequest({ body: staffAuthValidation.disableTwoFactorBody }),
  staffAuthController.disableTwoFactor,
)

export const staffAuthRouter = router
