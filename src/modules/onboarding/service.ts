import { AppError } from '../../common/errors/AppError'
import { OnboardingModel } from './model'

const planCatalog = [
  {
    code: 'FREE',
    name: 'Free Plan',
    price: 0,
    billingCycle: 'monthly',
    isPaid: false,
  },
  {
    code: 'PRO',
    name: 'Pro Plan',
    price: 499,
    billingCycle: 'monthly',
    isPaid: true,
  },
  {
    code: 'PREMIUM',
    name: 'Premium Plan',
    price: 999,
    billingCycle: 'monthly',
    isPaid: true,
  },
] as const

const findPlanByCode = (planCode: string) => {
  return planCatalog.find((plan) => plan.code === planCode)
}

export const onboardingService = {
  getPlanOptions: async () => {
    return planCatalog
  },

  selectPlan: async (userId: string, planCode: string) => {
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
  },

  completeOnboarding: async (userId: string) => {
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
  },

  getOnboardingStatus: async (userId: string) => {
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
  },
}
