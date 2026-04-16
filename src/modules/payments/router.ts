import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import {
  authenticateStaff,
  authenticateUser,
} from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  getMyPaymentById,
  getPaymentById,
  handleWebhook,
  initiatePayment,
  listAvailablePaymentGateways,
  listMyPayments,
  listPayments,
  refundPayment,
  verifyPayment,
} from './controller'
import { paymentsValidation } from './validation'

const router = Router()

router.get(
  '/payments/gateways/my',
  authenticateUser,
  listAvailablePaymentGateways,
)
router.get('/payments/my', authenticateUser, listMyPayments)
router.get(
  '/payments/my/:id',
  authenticateUser,
  validateRequest({ params: paymentsValidation.idParam }),
  getMyPaymentById,
)
router.post(
  '/payments/initiate',
  authenticateUser,
  validateRequest({ body: paymentsValidation.initiateBody }),
  initiatePayment,
)
router.post(
  '/payments/verify',
  authenticateStaff,
  requirePermission(PERMISSIONS.PAYMENTS_MANAGE),
  validateRequest({ body: paymentsValidation.verifyBody }),
  verifyPayment,
)

router.get(
  '/payments',
  authenticateStaff,
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
  listPayments,
)
router.get(
  '/payments/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
  validateRequest({ params: paymentsValidation.idParam }),
  getPaymentById,
)
router.post(
  '/payments/:id/refund',
  authenticateStaff,
  requirePermission(PERMISSIONS.PAYMENTS_MANAGE),
  validateRequest({
    params: paymentsValidation.idParam,
    body: paymentsValidation.refundBody,
  }),
  refundPayment,
)

router.post(
  '/webhooks/:gateway',
  validateRequest({ params: paymentsValidation.webhookParams }),
  handleWebhook,
)

export const paymentsRouter = router
