import { Router } from 'express'

import { validateRequest } from '../../common/middlewares/validateRequest'
import { healthController } from './controller'
import { healthValidation } from './validation'

const router = Router()

router.get(
  '/',
  validateRequest({ query: healthValidation.query }),
  healthController.getHealth,
)
router.get('/live', healthController.getLiveness)
router.get('/ready', healthController.getReadiness)

export const healthRouter = router
