import type { RequestHandler } from 'express'
import express from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { settingsController } from './controller'
import { settingsValidation } from './validation'

const router = express.Router()

router.get(
  '/',
  authenticateStaff,
  requirePermission('settings.view'),
  settingsController.getGlobalSettings as RequestHandler,
)

router.put(
  '/',
  authenticateStaff,
  requirePermission('settings.manage'),
  validateRequest({
    body: settingsValidation.updateBody,
  }),
  settingsController.updateGlobalSettings as RequestHandler,
)

router.get(
  '/maintenance',
  settingsController.getMaintenanceState as RequestHandler,
)

export const settingsRouter = router
