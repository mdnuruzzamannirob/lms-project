import { ReservationModel } from '../modules/reservations/model'
import { executeWithRetry } from './retry.util'

export const runReservationWorker = async (): Promise<void> => {
  await executeWithRetry(
    'reservation-claim-expiry',
    async () => {
      await ReservationModel.updateMany(
        {
          status: 'claimable',
          claimExpiresAt: { $lt: new Date() },
        },
        {
          $set: {
            status: 'expired',
          },
          $unset: {
            claimExpiresAt: '',
            queuePosition: '',
          },
        },
      )
    },
    {
      maxAttempts: 3,
      backoffMs: 300,
    },
  )
}
