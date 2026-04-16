import { SubscriptionModel } from '../modules/subscriptions/model'
import { subscriptionsService } from '../modules/subscriptions/service'
import { executeWithRetry } from './retry.util'

export const runSubscriptionDowngradeWorker = async (): Promise<void> => {
  await executeWithRetry(
    'subscription-downgrade',
    async () => {
      const dueScheduledSubscriptions = await SubscriptionModel.find({
        status: 'active',
        scheduledPlanId: { $ne: null },
        scheduledEffectiveDate: { $lte: new Date() },
      }).select('_id')

      for (const subscription of dueScheduledSubscriptions) {
        await subscriptionsService.finalizeScheduledPeriodEndTransition(
          subscription._id.toString(),
        )
      }

      await SubscriptionModel.updateMany(
        {
          status: 'active',
          endsAt: { $lt: new Date() },
          scheduledPlanId: null,
        },
        { $set: { status: 'expired' } },
      )
    },
    { maxAttempts: 4, backoffMs: 500 },
  )
}
