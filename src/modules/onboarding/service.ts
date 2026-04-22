import { AppError } from '../../common/errors/AppError'
import { config } from '../../config'
import { paymentsService } from '../payments/service'
import type { PlanBillingCycle } from '../plans/interface'
import { PlanModel } from '../plans/model'
import { formatPlan, getPlanBillingPrice } from '../plans/utils'
import { SubscriptionModel } from '../subscriptions/model'
import { subscriptionsService } from '../subscriptions/service'
import { onboardingInterestCatalog } from './constants'
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

const markOnboardingStarted = async (userId: string) => {
  const existing = await OnboardingModel.findOne({ userId })

  if (existing?.status === 'completed') {
    return existing
  }

  const startedAt = existing?.startedAt ?? new Date()

  return OnboardingModel.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        status: 'pending',
      },
      $set: {
        startedAt,
      },
    },
    { upsert: true, new: true },
  )
}

const getPlanOptions = async (userId: string) => {
  void userId

  const plans = await PlanModel.find({ isActive: true }).sort({
    sortOrder: 1,
    createdAt: 1,
  })

  return plans.map((plan) => formatPlan(plan))
}

const getInterestOptions = async () => {
  return onboardingInterestCatalog.map((item) => ({
    code: item.code,
    label: item.label,
  }))
}

const selectPlan = async (
  userId: string,
  planCode: string,
  locale?: 'en' | 'bn',
  billingCycle: PlanBillingCycle = 'monthly',
) => {
  const selectedPlan = await PlanModel.findOne({
    code: planCode.toUpperCase(),
    isActive: true,
  })

  if (!selectedPlan) {
    throw new AppError('Requested plan does not exist.', 404)
  }

  const onboarding = await OnboardingModel.findOne({ userId })

  if (onboarding?.status === 'completed') {
    const completedPlan = onboarding.selectedPlanCode
      ? await PlanModel.findOne({
          code: onboarding.selectedPlanCode,
          isActive: true,
        })
      : selectedPlan

    if (!completedPlan) {
      throw new AppError('Completed plan not found.', 404)
    }

    return {
      id: onboarding._id.toString(),
      success: true,
      subscriptionCreated: false,
      selectedPlanCode: completedPlan.code,
      plan: {
        code: completedPlan.code,
        name: completedPlan.name,
        price: completedPlan.price,
      },
      status: 'completed',
      nextStep: 'onboarding_completed' as const,
    }
  }

  const updatedOnboarding = await OnboardingModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        selectedPlanCode: selectedPlan.code,
        selectedPlanName: selectedPlan.name,
        selectedPlanPrice: getPlanBillingPrice(
          selectedPlan.price,
          billingCycle,
        ),
        selectedBillingCycle: selectedPlan.isFree ? 'monthly' : billingCycle,
        selectedAt: new Date(),
        status: selectedPlan.isFree ? 'completed' : 'selected',
      },
    },
    { upsert: true, new: true },
  )

  if (!updatedOnboarding) {
    throw new AppError('Unable to store onboarding selection.', 500)
  }

  const normalizedBillingCycle: PlanBillingCycle = selectedPlan.isFree
    ? 'monthly'
    : billingCycle
  const billingAmount = getPlanBillingPrice(
    selectedPlan.price,
    normalizedBillingCycle,
  )

  if (selectedPlan.isFree) {
    const subscription = await subscriptionsService.createSubscription({
      userId,
      planId: selectedPlan._id.toString(),
      autoRenew: false,
    })

    await markOnboardingCompleted(userId)

    return {
      id: updatedOnboarding._id.toString(),
      success: true,
      subscriptionCreated: true,
      subscriptionId: subscription.id,
      selectedPlanCode: selectedPlan.code,
      plan: {
        code: selectedPlan.code,
        name: selectedPlan.name,
        price: billingAmount,
        billingCycle: normalizedBillingCycle,
      },
      status: 'completed',
      nextStep: 'onboarding_completed' as const,
    }
  }

  const resolvedLocale = locale === 'bn' ? 'bn' : 'en'
  const planQuery = new URLSearchParams({
    plan_id: selectedPlan.code,
    plan_name: selectedPlan.name,
    price: billingAmount.toFixed(2),
    currency: selectedPlan.currency,
    billing_cycle: normalizedBillingCycle,
  })
  const successUrl = `${config.frontendUrl}/${resolvedLocale}/onboarding/payment/success?${planQuery.toString()}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${config.frontendUrl}/${resolvedLocale}/onboarding/payment/failed?${planQuery.toString()}`

  const initiatedPayment = await paymentsService.initiatePayment({
    userId,
    planId: selectedPlan._id.toString(),
    gateway: 'stripe',
    billingCycle: normalizedBillingCycle,
    autoRenew: true,
    successUrl,
    cancelUrl,
  })

  return {
    id: updatedOnboarding._id.toString(),
    success: true,
    subscriptionCreated: false,
    subscriptionId: initiatedPayment.payment.subscriptionId,
    selectedPlanCode: selectedPlan.code,
    plan: {
      code: selectedPlan.code,
      name: selectedPlan.name,
      price: billingAmount,
      billingCycle: normalizedBillingCycle,
    },
    status: updatedOnboarding.status,
    nextStep: 'redirect_to_payment' as const,
    paymentId: initiatedPayment.payment.id,
    sessionId: initiatedPayment.sessionId,
    url: initiatedPayment.url,
    redirectUrl: initiatedPayment.redirectUrl ?? initiatedPayment.url,
    checkout_url: initiatedPayment.checkout_url,
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

  const completedOnboarding = await markOnboardingCompleted(userId)

  return {
    id: completedOnboarding._id.toString(),
    status: completedOnboarding.status,
    completedAt:
      completedOnboarding.completedAt?.toISOString() ??
      new Date().toISOString(),
    selectedPlanCode: completedOnboarding.selectedPlanCode,
  }
}

const confirmPayment = async (
  userId: string,
  sessionId: string,
  reference?: string,
) => {
  const onboarding = await OnboardingModel.findOne({ userId })

  if (!onboarding || !onboarding.selectedPlanCode) {
    throw new AppError('No selected onboarding plan found.', 400)
  }

  const selectedPlan = await PlanModel.findOne({
    code: onboarding.selectedPlanCode,
    isActive: true,
  })

  if (!selectedPlan) {
    throw new AppError('Selected onboarding plan not found.', 404)
  }

  if (selectedPlan.isFree) {
    await markOnboardingCompleted(userId)
    return {
      status: 'completed',
      selectedPlanCode: onboarding.selectedPlanCode,
      completedAt: new Date().toISOString(),
    }
  }

  await paymentsService.confirmStripeCheckoutSessionForUser({
    userId,
    sessionId,
    ...(reference ? { reference } : {}),
  })

  return getOnboardingStatus(userId)
}

const getOnboardingStatus = async (userId: string) => {
  const onboarding = await OnboardingModel.findOne({ userId })

  if (!onboarding) {
    return {
      status: 'pending',
      interests: [],
      selectedLanguage: undefined,
    }
  }

  return {
    status: onboarding.status,
    startedAt: onboarding.startedAt?.toISOString(),
    selectedPlanCode: onboarding.selectedPlanCode,
    selectedPlanName: onboarding.selectedPlanName,
    selectedPlanPrice: onboarding.selectedPlanPrice,
    selectedBillingCycle: onboarding.selectedBillingCycle,
    selectedAt: onboarding.selectedAt?.toISOString(),
    interests: onboarding.interests ?? [],
    selectedLanguage: onboarding.selectedLanguage,
    completedAt: onboarding.completedAt?.toISOString(),
  }
}

const startOnboarding = async (userId: string) => {
  await markOnboardingStarted(userId)
  return getOnboardingStatus(userId)
}

const storeInterests = async (
  userId: string,
  interests: string[],
): Promise<{ success: boolean; interests: string[] }> => {
  const onboarding = await OnboardingModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        interests,
      },
    },
    { upsert: true, new: true },
  )

  return {
    success: true,
    interests: onboarding.interests ?? [],
  }
}

const storeLanguage = async (
  userId: string,
  language: string,
): Promise<{ success: boolean; language: string }> => {
  const onboarding = await OnboardingModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        selectedLanguage: language,
      },
    },
    { upsert: true, new: true },
  )

  return {
    success: true,
    language: onboarding.selectedLanguage ?? language,
  }
}

export const onboardingService = {
  getPlanOptions,
  getInterestOptions,
  selectPlan,
  completeOnboarding,
  confirmPayment,
  getOnboardingStatus,
  startOnboarding,
  markOnboardingCompleted,
  storeInterests,
  storeLanguage,
}
