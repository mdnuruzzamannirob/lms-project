import { SubscriptionModel } from '../modules/subscriptions/model'
import { executeWithRetry } from './retry.util'

export const runSubscriptionDowngradeWorker = async (): Promise<void> => {
  await executeWithRetry(
    'subscription-downgrade',
    async () => {
      await SubscriptionModel.updateMany(
        { status: 'active', endsAt: { $lt: new Date() } },
        { $set: { status: 'expired' } },
      )
    },
    { maxAttempts: 4, backoffMs: 500 },
  )
}
