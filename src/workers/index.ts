import { schedulerService } from '../common/services/scheduler.service'
import { config } from '../config'
import { runBorrowExpiryWorker } from './borrow-expiry.worker'
import { runNotificationWorker } from './notification.worker'
import { runReportGeneratorWorker } from './report-generator.worker'
import { runReservationWorker } from './reservation.worker'
import { runSubscriptionWorker } from './subscription.worker'

export const registerBackgroundWorkers = () => {
  const intervalMs = config.worker.pollIntervalMs

  schedulerService.registerJob({
    name: 'worker.report-generator',
    intervalMs,
    handler: runReportGeneratorWorker,
  })

  schedulerService.registerJob({
    name: 'worker.notification',
    intervalMs,
    handler: runNotificationWorker,
  })

  schedulerService.registerJob({
    name: 'worker.subscription',
    intervalMs,
    handler: runSubscriptionWorker,
  })

  schedulerService.registerJob({
    name: 'worker.borrow-expiry',
    intervalMs,
    handler: runBorrowExpiryWorker,
  })

  schedulerService.registerJob({
    name: 'worker.reservation',
    intervalMs,
    handler: runReservationWorker,
  })
}
