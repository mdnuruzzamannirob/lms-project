import { Types } from 'mongoose'
import { IPlan, Plan } from '../../models/plan.model'
import { User } from '../../models/user.model'

export interface PlanSelectResult {
  payment_required: boolean
  redirect: string
  plan_id?: Types.ObjectId
  plan_name?: string
  billing_cycle?: string
  amount?: number
  currency?: string
}

export const getActivePlans = async (): Promise<IPlan[]> =>
  Plan.find({ is_active: true }).sort({ sort_order: 1 })

export const selectPlan = async (
  userId: unknown,
  planId: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly',
): Promise<PlanSelectResult> => {
  const plan = await Plan.findOne({ _id: planId, is_active: true })
  if (!plan) {
    const err = new Error('Plan not found.') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }

  if (plan.is_free) {
    await User.findByIdAndUpdate(userId, {
      current_plan_id: plan._id,
      subscription_status: 'free',
      onboarding_completed: true,
    })
    return { payment_required: false, redirect: '/dashboard' }
  }

  // Paid plan — payment wired in Phase 5
  return {
    payment_required: true,
    plan_id: plan._id,
    plan_name: plan.name,
    billing_cycle: billingCycle,
    amount: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
    currency: plan.currency,
    redirect: '/onboarding/payment',
  }
}

export const completeOnboarding = async (userId: unknown): Promise<void> => {
  await User.findByIdAndUpdate(userId, { onboarding_completed: true })
}
