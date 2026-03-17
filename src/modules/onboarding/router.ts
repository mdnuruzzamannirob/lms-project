import { Router } from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  completeOnboarding,
  getMyOnboardingStatus,
  getPlanOptions,
  selectPlan,
} from './controller'
import { onboardingValidation } from './validation'

const router = Router()

router.get('/plans', getPlanOptions)
router.get('/status', authenticateUser, getMyOnboardingStatus)
router.post(
  '/select',
  authenticateUser,
  validateRequest({ body: onboardingValidation.selectPlanBody }),
  selectPlan,
)
router.post(
  '/complete',
  authenticateUser,
  validateRequest({ body: onboardingValidation.completeBody }),
  completeOnboarding,
)

export const onboardingRouter = router
