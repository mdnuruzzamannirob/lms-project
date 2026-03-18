import { SubscriptionModel } from '../modules/subscriptions/model'
import { executeWithRetry } from './retry.util'

export const runSubscriptionWorker = async (): Promise<void> => {
  await executeWithRetry(
    'subscription-expiry',
    async () => {
      await SubscriptionModel.updateMany(
        {
          status: 'active',
          endsAt: { $lt: new Date() },
        },
        {
          $set: {
            status: 'expired',
          },
        },
      )
    },
    {
      maxAttempts: 4,
      backoffMs: 500,
    },
  )
}
