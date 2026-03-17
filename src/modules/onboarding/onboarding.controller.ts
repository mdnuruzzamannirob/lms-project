import { NextFunction, Request, Response } from 'express'
import { sendSuccess } from '../../utils/response'
import * as OnboardingService from './onboarding.service'

// GET /onboarding/plans
export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const plans = await OnboardingService.getActivePlans()
    sendSuccess(res, plans)
  } catch (err) {
    next(err)
  }
}

// POST /onboarding/select
export const selectPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { plan_id, billing_cycle = 'monthly' } = req.body as {
      plan_id: string
      billing_cycle?: 'monthly' | 'yearly'
    }
    const result = await OnboardingService.selectPlan(
      req.user!._id,
      plan_id,
      billing_cycle,
    )
    const message = result.payment_required
      ? 'Proceed to payment.'
      : 'Free plan activated.'
    sendSuccess(res, result, message)
  } catch (err) {
    next(err)
  }
}

// POST /onboarding/complete
export const completeOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await OnboardingService.completeOnboarding(req.user!._id)
    sendSuccess(res, null, 'Onboarding completed.')
  } catch (err) {
    next(err)
  }
}
