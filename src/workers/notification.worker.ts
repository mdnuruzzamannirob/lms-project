import { NotificationModel } from '../modules/notifications/model'
import { executeWithRetry } from './retry.util'

export const runNotificationWorker = async (): Promise<void> => {
  await executeWithRetry(
    'notification-delivery',
    async () => {
      await NotificationModel.updateMany(
        {
          deliveredAt: { $exists: false },
        },
        {
          $set: {
            deliveredAt: new Date(),
          },
        },
      )
    },
    {
      maxAttempts: 3,
      backoffMs: 400,
    },
  )
}
