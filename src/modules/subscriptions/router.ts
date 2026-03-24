import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import {
  authenticateStaff,
  authenticateUser,
} from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { subscriptionsController } from './controller'
import { subscriptionsValidation } from './validation'

const router = Router()

router.get(
  '/my',
  authenticateUser,
  subscriptionsController.getMyCurrentSubscription,
)
router.get(
  '/my/history',
  authenticateUser,
  subscriptionsController.getMySubscriptionHistory,
)
router.patch(
  '/my/cancel',
  authenticateUser,
  validateRequest({ body: subscriptionsValidation.cancelBody }),
  subscriptionsController.cancelMySubscription,
)
router.patch(
  '/my/renew',
  authenticateUser,
  subscriptionsController.renewMySubscription,
)
router.patch(
  '/my/upgrade',
  authenticateUser,
  validateRequest({ body: subscriptionsValidation.changePlanBody }),
  subscriptionsController.upgradeMySubscription,
)
router.patch(
  '/my/downgrade',
  authenticateUser,
  validateRequest({ body: subscriptionsValidation.changePlanBody }),
  subscriptionsController.downgradeMySubscription,
)

router.get(
  '/',
  authenticateStaff,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_VIEW),
  subscriptionsController.listSubscriptions,
)
router.get(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_VIEW),
  validateRequest({ params: subscriptionsValidation.idParam }),
  subscriptionsController.getSubscriptionById,
)
router.post(
  '/',
  authenticateStaff,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  validateRequest({ body: subscriptionsValidation.createBody }),
  subscriptionsController.createSubscription,
)
router.patch(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  validateRequest({
    params: subscriptionsValidation.idParam,
    body: subscriptionsValidation.adminUpdateBody,
  }),
  subscriptionsController.adminUpdateSubscription,
)

export const subscriptionsRouter = router
