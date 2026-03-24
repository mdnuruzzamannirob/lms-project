import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { plansController } from './controller'
import { plansValidation } from './validation'

const router = Router()

router.get('/', validateRequest({ query: plansValidation.query }), plansController.listPlans)
router.get(
  '/:id',
  validateRequest({ params: plansValidation.idParam }),
  plansController.getPlanById,
)

router.post(
  '/',
  authenticateStaff,
  requirePermission(PERMISSIONS.PLANS_MANAGE),
  validateRequest({ body: plansValidation.createBody }),
  plansController.createPlan,
)
router.put(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PLANS_MANAGE),
  validateRequest({
    params: plansValidation.idParam,
    body: plansValidation.updateBody,
  }),
  plansController.updatePlan,
)
router.patch(
  '/:id/toggle',
  authenticateStaff,
  requirePermission(PERMISSIONS.PLANS_MANAGE),
  validateRequest({ params: plansValidation.idParam }),
  plansController.togglePlan,
)

export const plansRouter = router
