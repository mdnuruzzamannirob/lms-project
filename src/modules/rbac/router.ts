import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { rbacController } from './controller'
import { rbacValidation } from './validation'

const router = Router()

router.use(authenticateStaff)

router.get(
  '/permissions',
  requirePermission(PERMISSIONS.RBAC_VIEW),
  rbacController.listPermissions,
)
router.get(
  '/roles',
  requirePermission(PERMISSIONS.RBAC_VIEW),
  rbacController.listRoles,
)
router.get(
  '/roles/:id',
  requirePermission(PERMISSIONS.RBAC_VIEW),
  validateRequest({ params: rbacValidation.idParam }),
  rbacController.getRoleById,
)
router.post(
  '/roles',
  requirePermission(PERMISSIONS.RBAC_MANAGE),
  validateRequest({ body: rbacValidation.createRoleBody }),
  rbacController.createRole,
)
router.put(
  '/roles/:id',
  requirePermission(PERMISSIONS.RBAC_MANAGE),
  validateRequest({
    params: rbacValidation.idParam,
    body: rbacValidation.updateRoleBody,
  }),
  rbacController.updateRole,
)
router.delete(
  '/roles/:id',
  requirePermission(PERMISSIONS.RBAC_MANAGE),
  validateRequest({ params: rbacValidation.idParam }),
  rbacController.deleteRole,
)

export const rbacRouter = router
