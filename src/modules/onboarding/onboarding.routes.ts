import { Router } from 'express'
import { authenticateUser } from '../../middleware/authenticate'
import { validate } from '../../middleware/validate'
import * as OnboardingController from './onboarding.controller'
import { selectPlanRules } from './onboarding.validator'

const router: Router = Router()

// GET /onboarding/plans — Public
router.get('/plans', OnboardingController.getPlans)

// POST /onboarding/select — Authenticated
router.post(
  '/select',
  authenticateUser,
  validate(selectPlanRules),
  OnboardingController.selectPlan,
)

// POST /onboarding/complete — Authenticated
router.post(
  '/complete',
  authenticateUser,
  OnboardingController.completeOnboarding,
)

export default router
