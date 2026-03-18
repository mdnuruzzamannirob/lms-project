import express from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { membersController } from './controller'
import { membersValidation } from './validation'

const router = express.Router()

// Admin routes
router.get(
  '/',
  authenticateStaff,
  requirePermission('members.view'),
  validateRequest({
    query: membersValidation.listQuery,
  }),
  membersController.listMembers,
)

router.get(
  '/:userId',
  authenticateStaff,
  requirePermission('members.view'),
  validateRequest({
    params: membersValidation.userIdParam,
  }),
  membersController.getMemberDetail,
)

router.patch(
  '/:userId/suspend',
  authenticateStaff,
  requirePermission('members.manage'),
  validateRequest({
    params: membersValidation.userIdParam,
    body: membersValidation.suspendBody,
  }),
  membersController.suspendMember,
)

router.patch(
  '/:userId/unsuspend',
  authenticateStaff,
  requirePermission('members.manage'),
  validateRequest({
    params: membersValidation.userIdParam,
  }),
  membersController.unsuspendMember,
)

router.get(
  '/:userId/reading-history',
  authenticateStaff,
  requirePermission('members.view'),
  validateRequest({
    params: membersValidation.userIdParam,
    query: membersValidation.readingHistoryQuery,
  }),
  membersController.getMemberReadingHistory,
)

router.get(
  '/:userId/payments',
  authenticateStaff,
  requirePermission('members.view'),
  validateRequest({
    params: membersValidation.userIdParam,
    query: membersValidation.paymentHistoryQuery,
  }),
  membersController.getMemberPaymentHistory,
)

export const membersRouter = router
