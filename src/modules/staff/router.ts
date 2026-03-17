import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  getStaffActivity,
  getStaffById,
  inviteStaff,
  listStaff,
  reinviteStaff,
  removeStaff,
  suspendStaff,
  unsuspendStaff,
  updateStaffRole,
} from './controller'
import { staffValidation } from './validation'

const router = Router()

router.use(authenticateStaff)

router.get('/', requirePermission('staff.view'), listStaff)
router.get(
  '/:id',
  requirePermission('staff.view'),
  validateRequest({ params: staffValidation.idParam }),
  getStaffById,
)
router.get(
  '/:id/activity',
  requirePermission('staff.view'),
  validateRequest({ params: staffValidation.idParam }),
  getStaffActivity,
)

router.post(
  '/invite',
  requirePermission('staff.manage'),
  validateRequest({ body: staffValidation.inviteBody }),
  inviteStaff,
)
router.post(
  '/:id/reinvite',
  requirePermission('staff.manage'),
  validateRequest({ params: staffValidation.idParam }),
  reinviteStaff,
)
router.patch(
  '/:id/role',
  requirePermission('staff.manage'),
  validateRequest({
    params: staffValidation.idParam,
    body: staffValidation.updateRoleBody,
  }),
  updateStaffRole,
)
router.patch(
  '/:id/suspend',
  requirePermission('staff.manage'),
  validateRequest({ params: staffValidation.idParam }),
  suspendStaff,
)
router.patch(
  '/:id/unsuspend',
  requirePermission('staff.manage'),
  validateRequest({ params: staffValidation.idParam }),
  unsuspendStaff,
)
router.delete(
  '/:id',
  requirePermission('staff.manage'),
  validateRequest({ params: staffValidation.idParam }),
  removeStaff,
)

export const staffRouter = router
