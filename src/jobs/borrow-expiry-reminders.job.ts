import { BorrowModel } from '../modules/borrows/model'
import { NotificationType } from '../modules/notifications/interface'
import { notificationsService } from '../modules/notifications/service'

export const runBorrowExpiryReminderJob = async (): Promise<{
  reminded: number
}> => {
  const now = new Date()
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const borrows = await BorrowModel.find({
    status: 'borrowed',
    dueAt: { $gte: now, $lte: inOneDay },
  })

  for (const borrow of borrows) {
    await notificationsService.createNotification({
      userId: borrow.userId.toString(),
      type: NotificationType.BORROW_DUE_SOON,
      title: 'Borrow due reminder',
      body: 'One of your borrowed books will be due within 24 hours.',
      relatedEntityId: borrow._id.toString(),
      relatedEntityType: 'borrow',
    })
  }

  return { reminded: borrows.length }
}
