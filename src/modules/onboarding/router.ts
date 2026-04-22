import { Router } from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { onboardingController } from './controller'
import { onboardingValidation } from './validation'

const router = Router()

router.get('/plans', authenticateUser, onboardingController.getPlanOptions)
router.get(
  '/interests',
  authenticateUser,
  onboardingController.getInterestOptions,
)
router.get(
  '/status',
  authenticateUser,
  onboardingController.getMyOnboardingStatus,
)
router.post('/start', authenticateUser, onboardingController.startOnboarding)
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
router.post(
  '/confirm-payment',
  authenticateUser,
  validateRequest({ body: onboardingValidation.confirmPaymentBody }),
  onboardingController.confirmPayment,
)
router.patch(
  '/interests',
  authenticateUser,
  validateRequest({ body: onboardingValidation.storeInterestsBody }),
  onboardingController.storeInterests,
)
router.patch(
  '/language',
  authenticateUser,
  validateRequest({ body: onboardingValidation.storeLanguageBody }),
  onboardingController.storeLanguage,
)

export const onboardingRouter = router
