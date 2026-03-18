import express from 'express'

import {
  authenticateStaff,
  authenticateUser,
} from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { notificationsController } from './controller'
import { notificationsValidation } from './validation'

const router = express.Router()

// User routes
router.get(
  '/',
  authenticateUser,
  validateRequest({
    query: notificationsValidation.listQuery,
  }),
  notificationsController.getMyNotifications,
)

router.patch(
  '/:id/read',
  authenticateUser,
  validateRequest({
    params: notificationsValidation.idParam,
  }),
  notificationsController.markAsRead,
)

router.patch(
  '/mark-read',
  authenticateUser,
  validateRequest({
    body: notificationsValidation.bulkMarkBody,
  }),
  notificationsController.bulkMarkAsRead,
)

router.get(
  '/unread-count',
  authenticateUser,
  notificationsController.getUnreadCount,
)

// Staff/Admin routes
router.post(
  '/bulk-send',
  authenticateStaff,
  requirePermission('notifications.manage'),
  validateRequest({
    body: notificationsValidation.bulkSendBody,
  }),
  notificationsController.bulkSend,
)

export const notificationsRouter = router
