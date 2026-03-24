import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { promotionsController } from './controller'
import { promotionsValidation } from './validation'

const router = Router()

router.post(
  '/coupons/validate',
  validateRequest({ body: promotionsValidation.validateCouponBody }),
  promotionsController.validateCoupon,
)

router.get(
  '/coupons',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_VIEW),
  promotionsController.listCoupons,
)
router.get(
  '/coupons/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_VIEW),
  validateRequest({ params: promotionsValidation.idParam }),
  promotionsController.getCouponById,
)
router.post(
  '/coupons',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({ body: promotionsValidation.createCouponBody }),
  promotionsController.createCoupon,
)
router.put(
  '/coupons/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({
    params: promotionsValidation.idParam,
    body: promotionsValidation.updateCouponBody,
  }),
  promotionsController.updateCoupon,
)
router.patch(
  '/coupons/:id/toggle',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({ params: promotionsValidation.idParam }),
  promotionsController.toggleCoupon,
)
router.delete(
  '/coupons/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({ params: promotionsValidation.idParam }),
  promotionsController.deleteCoupon,
)

router.get('/flash-sales/active', promotionsController.getActiveFlashSales)
router.get(
  '/flash-sales',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_VIEW),
  promotionsController.listFlashSales,
)
router.post(
  '/flash-sales',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({ body: promotionsValidation.createFlashSaleBody }),
  promotionsController.createFlashSale,
)
router.put(
  '/flash-sales/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({
    params: promotionsValidation.idParam,
    body: promotionsValidation.updateFlashSaleBody,
  }),
  promotionsController.updateFlashSale,
)
router.patch(
  '/flash-sales/:id/toggle',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({ params: promotionsValidation.idParam }),
  promotionsController.toggleFlashSale,
)
router.delete(
  '/flash-sales/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PROMOTIONS_MANAGE),
  validateRequest({ params: promotionsValidation.idParam }),
  promotionsController.deleteFlashSale,
)

export const promotionsRouter = router
