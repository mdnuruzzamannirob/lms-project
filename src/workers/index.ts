import { schedulerService } from '../common/services/scheduler.service'
import { config } from '../config'
import { runNotificationWorker } from './notification.worker'
import { runReportGeneratorWorker } from './report-generator.worker'
import { runSubscriptionDowngradeWorker } from './subscription-downgrade.worker'
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
    name: 'worker.subscription-downgrade',
    intervalMs,
    handler: runSubscriptionDowngradeWorker,
  })
}
