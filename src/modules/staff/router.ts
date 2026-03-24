import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { staffController } from './controller'
import { staffValidation } from './validation'

const router = Router()

router.use(authenticateStaff)

router.get(
  '/',
  requirePermission(PERMISSIONS.STAFF_VIEW),
  staffController.listStaff,
)
router.get(
  '/:id',
  requirePermission(PERMISSIONS.STAFF_VIEW),
  validateRequest({ params: staffValidation.idParam }),
  staffController.getStaffById,
)
router.get(
  '/:id/activity',
  requirePermission(PERMISSIONS.STAFF_VIEW),
  validateRequest({ params: staffValidation.idParam }),
  staffController.getStaffActivity,
)

router.post(
  '/invite',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({ body: staffValidation.inviteBody }),
  staffController.inviteStaff,
)
router.post(
  '/:id/reinvite',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({ params: staffValidation.idParam }),
  staffController.reinviteStaff,
)
router.patch(
  '/:id/role',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({
    params: staffValidation.idParam,
    body: staffValidation.updateRoleBody,
  }),
  staffController.updateStaffRole,
)
router.patch(
  '/:id/suspend',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({ params: staffValidation.idParam }),
  staffController.suspendStaff,
)
router.patch(
  '/:id/unsuspend',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({ params: staffValidation.idParam }),
  staffController.unsuspendStaff,
)
router.post(
  '/:id/2fa/reset',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({ params: staffValidation.idParam }),
  staffController.resetTwoFactor,
)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validateRequest({ params: staffValidation.idParam }),
  staffController.removeStaff,
)

export const staffRouter = router
