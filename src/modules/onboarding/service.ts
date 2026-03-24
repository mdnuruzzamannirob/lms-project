import { AppError } from '../../common/errors/AppError'
import { planCatalog } from './constants'
import { OnboardingModel } from './model'
import { findPlanByCode } from './utils'

const getPlanOptions = async () => {
  return planCatalog
}

const selectPlan = async (userId: string, planCode: string) => {
  const selectedPlan = findPlanByCode(planCode)

  if (!selectedPlan) {
    throw new AppError('Requested plan does not exist.', 404)
  }

  const onboarding = await OnboardingModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        selectedPlanCode: selectedPlan.code,
        selectedPlanName: selectedPlan.name,
        selectedPlanPrice: selectedPlan.price,
        selectedAt: new Date(),
        status: 'selected',
      },
    },
    { upsert: true, new: true },
  )

  return {
    id: onboarding._id.toString(),
    plan: selectedPlan,
    status: onboarding.status,
    nextStep: selectedPlan.isPaid
      ? 'redirect_to_payment'
      : 'complete_onboarding',
  }
}

const completeOnboarding = async (userId: string) => {
  const onboarding = await OnboardingModel.findOne({ userId })

  if (!onboarding || !onboarding.selectedPlanCode) {
    throw new AppError(
      'Plan must be selected before onboarding completion.',
      400,
    )
  }

  onboarding.status = 'completed'
  onboarding.completedAt = new Date()
  await onboarding.save()

  return {
    id: onboarding._id.toString(),
    status: onboarding.status,
    completedAt: onboarding.completedAt.toISOString(),
    selectedPlanCode: onboarding.selectedPlanCode,
  }
}

const getOnboardingStatus = async (userId: string) => {
  const onboarding = await OnboardingModel.findOne({ userId })

  if (!onboarding) {
    return {
      status: 'pending',
    }
  }

  return {
    status: onboarding.status,
    selectedPlanCode: onboarding.selectedPlanCode,
    completedAt: onboarding.completedAt?.toISOString(),
  }
}

export const onboardingService = {
  getPlanOptions,
  selectPlan,
  completeOnboarding,
  getOnboardingStatus,
}
