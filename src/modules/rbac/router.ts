import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  createRole,
  deleteRole,
  getRoleById,
  listPermissions,
  listRoles,
  updateRole,
} from './controller'
import { rbacValidation } from './validation'

const router = Router()

router.use(authenticateStaff)

router.get('/permissions', requirePermission('rbac.view'), listPermissions)
router.get('/roles', requirePermission('rbac.view'), listRoles)
router.get(
  '/roles/:id',
  requirePermission('rbac.view'),
  validateRequest({ params: rbacValidation.idParam }),
  getRoleById,
)
router.post(
  '/roles',
  requirePermission('rbac.manage'),
  validateRequest({ body: rbacValidation.createRoleBody }),
  createRole,
)
router.put(
  '/roles/:id',
  requirePermission('rbac.manage'),
  validateRequest({
    params: rbacValidation.idParam,
    body: rbacValidation.updateRoleBody,
  }),
  updateRole,
)
router.delete(
  '/roles/:id',
  requirePermission('rbac.manage'),
  validateRequest({ params: rbacValidation.idParam }),
  deleteRole,
)

export const rbacRouter = router
