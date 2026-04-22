import { AppError } from '../../common/errors/AppError'
import type { IPlan, PlanBillingCycle } from './interface'

export const getPlanBillingPrice = (
  price: number,
  billingCycle: PlanBillingCycle = 'monthly',
) => {
  const normalizedPrice = Number(price.toFixed(2))

  if (billingCycle === 'yearly') {
    return Number((normalizedPrice * 12 * 0.75).toFixed(2))
  }

  return normalizedPrice
}

export const formatPlan = (plan: IPlan | null) => {
  if (!plan) {
    throw new AppError('Plan not found.', 404)
  }

  const monthlyPrice = getPlanBillingPrice(plan.price, 'monthly')
  const yearlyPrice = getPlanBillingPrice(plan.price, 'yearly')

  return {
    id: plan._id.toString(),
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    durationDays: plan.durationDays,
    maxDevices: plan.maxDevices,
    downloadEnabled: plan.downloadEnabled,
    accessLevel: plan.accessLevel,
    features: plan.features,
    isFree: plan.isFree,
    recommended: plan.recommended,
    monthlyPrice,
    yearlyPrice,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}
