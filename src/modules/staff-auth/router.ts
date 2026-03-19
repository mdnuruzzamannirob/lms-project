import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  acceptInvite,
  changeStaffPassword,
  disableTwoFactor,
  enableTwoFactor,
  getStaffMe,
  setupTwoFactor,
  staffLogin,
  staffLogout,
  verifyTwoFactor,
} from './controller'
import { staffAuthValidation } from './validation'

const router = Router()

router.post(
  '/login',
  validateRequest({ body: staffAuthValidation.loginBody }),
  staffLogin,
)
router.post(
  '/accept-invite',
  validateRequest({ body: staffAuthValidation.acceptInviteBody }),
  acceptInvite,
)
router.post('/logout', authenticateStaff, staffLogout)
router.get('/me', authenticateStaff, getStaffMe)
router.patch(
  '/me/password',
  authenticateStaff,
  validateRequest({ body: staffAuthValidation.changePasswordBody }),
  changeStaffPassword,
)
router.post(
  '/2fa/setup',
  validateRequest({ body: staffAuthValidation.staffTwoFactorSetupBody }),
  setupTwoFactor,
)
router.post(
  '/2fa/enable',
  validateRequest({ body: staffAuthValidation.staffTwoFactorEnableBody }),
  enableTwoFactor,
)
router.post(
  '/2fa/verify',
  validateRequest({ body: staffAuthValidation.staffTwoFactorVerifyBody }),
  verifyTwoFactor,
)
router.post(
  '/2fa/disable',
  authenticateStaff,
  validateRequest({ body: staffAuthValidation.disableTwoFactorBody }),
  disableTwoFactor,
)

export const staffAuthRouter = router
