import { PlanModel } from '../../modules/plans/model'
import { SubscriptionModel } from '../../modules/subscriptions/model'

type AccessLevel = 'free' | 'basic' | 'premium'

const PLAN_ACCESS_HIERARCHY: Record<AccessLevel, AccessLevel[]> = {
  free: ['free'],
  basic: ['free', 'basic'],
  premium: ['free', 'basic', 'premium'],
}

export const subscriptionAccessService = {
  checkUserAccess: async (
    userId: string,
    bookAccessLevel: AccessLevel,
  ): Promise<{ hasAccess: boolean; reason?: string }> => {
    if (bookAccessLevel === 'free') {
      return { hasAccess: true }
    }

    const subscription = await SubscriptionModel.findOne({
      userId,
      status: 'active',
      endsAt: { $gte: new Date() },
    }).lean()

    if (!subscription) {
      return { hasAccess: false, reason: 'No active subscription found.' }
    }

    const plan = await PlanModel.findById(subscription.planId)
      .select('accessLevel')
      .lean()

    if (!plan) {
      return { hasAccess: false, reason: 'Subscription plan not found.' }
    }

    const planAccessLevel = (plan as any).accessLevel as AccessLevel
    const allowedLevels = PLAN_ACCESS_HIERARCHY[planAccessLevel] ?? ['free']

    if (!allowedLevels.includes(bookAccessLevel)) {
      return {
        hasAccess: false,
        reason: `This book requires a ${bookAccessLevel} plan or higher.`,
      }
    }

    return { hasAccess: true }
  },
}
