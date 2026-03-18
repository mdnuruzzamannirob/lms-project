import { NotificationType } from '../modules/notifications/interface'
import { notificationsService } from '../modules/notifications/service'
import { ReservationModel } from '../modules/reservations/model'

export const runReservationClaimExpiryJob = async (): Promise<{
  expired: number
}> => {
  const reservations = await ReservationModel.find({
    status: 'claimable',
    claimExpiresAt: { $lt: new Date() },
  })

  for (const reservation of reservations) {
    reservation.status = 'expired'
    reservation.claimExpiresAt = undefined
    reservation.queuePosition = undefined
    await reservation.save()

    await notificationsService.createNotification({
      userId: reservation.userId.toString(),
      type: NotificationType.SYSTEM_MESSAGE,
      title: 'Reservation expired',
      body: 'Your reservation claim window has expired.',
      relatedEntityId: reservation._id.toString(),
      relatedEntityType: 'reservation',
    })
  }

  return { expired: reservations.length }
}
