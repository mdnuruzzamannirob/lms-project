import { NotificationType } from '../modules/notifications/interface'
import { notificationsService } from '../modules/notifications/service'
import { SubscriptionModel } from '../modules/subscriptions/model'

export const runRenewalReminderJob = async (): Promise<{
  reminded: number
}> => {
  const now = new Date()
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const subscriptions = await SubscriptionModel.find({
    status: 'active',
    autoRenew: true,
    endsAt: { $gte: now, $lte: inThreeDays },
  })

  for (const subscription of subscriptions) {
    await notificationsService.createNotification({
      userId: subscription.userId.toString(),
      type: NotificationType.SUBSCRIPTION_EXPIRING,
      title: 'Subscription renewal reminder',
      body: 'Your subscription will renew soon. Please ensure your payment method is active.',
      relatedEntityId: subscription._id.toString(),
      relatedEntityType: 'subscription',
    })
  }

  return { reminded: subscriptions.length }
}
