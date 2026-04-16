import { Router } from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { onboardingController } from './controller'
import { onboardingValidation } from './validation'

const router = Router()

router.get('/plans', authenticateUser, onboardingController.getPlanOptions)
router.get(
  '/status',
  authenticateUser,
  onboardingController.getMyOnboardingStatus,
)
router.post(
  '/select',
  authenticateUser,
  validateRequest({ body: onboardingValidation.selectPlanBody }),
  onboardingController.selectPlan,
)
router.post(
  '/complete',
  authenticateUser,
  validateRequest({ body: onboardingValidation.completeBody }),
  onboardingController.completeOnboarding,
)

export const onboardingRouter = router
