import { Router } from 'express'

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
  authenticateUser,
  validateRequest({ body: paymentsValidation.verifyBody }),
  verifyPayment,
)

router.get(
  '/payments',
  authenticateStaff,
  requirePermission('payments.view'),
  listPayments,
)
router.get(
  '/payments/:id',
  authenticateStaff,
  requirePermission('payments.view'),
  validateRequest({ params: paymentsValidation.idParam }),
  getPaymentById,
)
router.post(
  '/payments/:id/refund',
  authenticateStaff,
  requirePermission('payments.manage'),
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
