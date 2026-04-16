import { AppError } from '../../common/errors/AppError'
import { paymentsService } from '../payments/service'
import { PlanModel } from '../plans/model'
import { SubscriptionModel } from '../subscriptions/model'
import { subscriptionsService } from '../subscriptions/service'
import { OnboardingModel } from './model'

const getCurrentPlanContext = async (userId: string) => {
  const onboarding = await OnboardingModel.findOne({ userId })
  const currentSubscription = await SubscriptionModel.findOne({
    userId,
    status: { $in: ['active', 'pending'] },
  })
    .sort({ createdAt: -1 })
    .lean()

  const selectedPlan = onboarding?.selectedPlanCode
    ? await PlanModel.findOne({
        code: onboarding.selectedPlanCode,
        isActive: true,
      }).lean()
    : null

  return {
    onboarding,
    currentSubscription,
    selectedPlan,
  }
}

const markOnboardingCompleted = async (userId: string) => {
  const existing = await OnboardingModel.findOne({ userId })

  if (existing?.status === 'completed' && existing.completedAt) {
    return existing
  }

  const onboarding = await OnboardingModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
      },
    },
    { new: true, upsert: true },
  )

  return onboarding
}

const getPlanOptions = async (userId: string) => {
  const plans = await PlanModel.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()

  const { onboarding, currentSubscription, selectedPlan } =
    await getCurrentPlanContext(userId)

  const currentPlanId =
    currentSubscription?.planId?.toString() ?? selectedPlan?._id.toString()

  const currentPlan = currentPlanId
    ? (plans.find((plan) => plan._id.toString() === currentPlanId) ??
      (selectedPlan && selectedPlan._id.toString() === currentPlanId
        ? selectedPlan
        : null))
    : null

  const scheduledDowngrade =
    currentSubscription?.scheduledPlanId &&
    currentSubscription.scheduledEffectiveDate
      ? {
          planId: currentSubscription.scheduledPlanId.toString(),
          effectiveDate:
            currentSubscription.scheduledEffectiveDate.toISOString(),
        }
      : null

  return plans.map((plan) => {
    const isCurrentPlan = plan._id.toString() === currentPlanId
    const isPaid = !plan.isFree
    const isHigherTier =
      currentPlan != null && !plan.isFree && plan.price > currentPlan.price
    const isLowerTier =
      currentPlan != null && !plan.isFree && plan.price < currentPlan.price

    return {
      code: plan.code,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingCycle: 'monthly',
      isPaid,
      isCurrentPlan,
      canSelect: !isCurrentPlan,
      canUpgrade: Boolean(currentPlan && isHigherTier),
      canDowngrade: Boolean(currentPlan && isLowerTier),
      canCancel: Boolean(currentSubscription && !currentPlan?.isFree),
      canRenew: Boolean(currentSubscription && !currentPlan?.isFree),
      scheduledDowngrade:
        isCurrentPlan && scheduledDowngrade ? scheduledDowngrade : null,
      onboardingStatus: onboarding?.status ?? 'pending',
    }
  })
}

const selectPlan = async (userId: string, planCode: string) => {
  const selectedPlan = await PlanModel.findOne({
    code: planCode.toUpperCase(),
    isActive: true,
  })

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
        status: selectedPlan.isFree ? 'completed' : 'selected',
      },
    },
    { upsert: true, new: true },
  )

  if (selectedPlan.isFree) {
    await subscriptionsService.createSubscription({
      userId,
      planId: selectedPlan._id.toString(),
      autoRenew: false,
    })

    await markOnboardingCompleted(userId)

    return {
      id: onboarding._id.toString(),
      plan: {
        code: selectedPlan.code,
        name: selectedPlan.name,
        price: selectedPlan.price,
        currency: selectedPlan.currency,
        isPaid: false,
      },
      status: onboarding.status,
      nextStep: 'onboarding_completed',
    }
  }

  const payment = await paymentsService.initiatePayment({
    userId,
    planId: selectedPlan._id.toString(),
    gateway: 'stripe',
    autoRenew: true,
  })

  return {
    id: onboarding._id.toString(),
    plan: {
      code: selectedPlan.code,
      name: selectedPlan.name,
      price: selectedPlan.price,
      currency: selectedPlan.currency,
      isPaid: true,
    },
    status: onboarding.status,
    nextStep: 'redirect_to_payment',
    checkout_url: payment.checkout_url,
    paymentId: payment.payment.id,
    sessionId: payment.sessionId,
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

  const selectedPlan = await PlanModel.findOne({
    code: onboarding.selectedPlanCode,
  })

  if (!selectedPlan) {
    throw new AppError('Selected plan not found.', 404)
  }

  if (!selectedPlan.isFree) {
    const activeSubscription = await SubscriptionModel.findOne({
      userId,
      planId: selectedPlan._id,
      status: 'active',
    })

    if (!activeSubscription) {
      throw new AppError(
        'Paid plan onboarding cannot be completed before successful payment.',
        400,
      )
    }
  }

  await markOnboardingCompleted(userId)

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
  markOnboardingCompleted,
}
