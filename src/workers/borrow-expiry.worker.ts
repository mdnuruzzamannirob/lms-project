import { BorrowModel } from '../modules/borrows/model'
import { executeWithRetry } from './retry.util'

export const runBorrowExpiryWorker = async (): Promise<void> => {
  await executeWithRetry(
    'borrow-expiry',
    async () => {
      await BorrowModel.updateMany(
        {
          status: 'borrowed',
          dueAt: { $lt: new Date() },
        },
        {
          $set: {
            status: 'overdue',
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
