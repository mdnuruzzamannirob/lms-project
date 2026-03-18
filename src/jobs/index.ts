import cron, { type ScheduledTask } from 'node-cron'

import { logger } from '../config/logger'
import { runBirthdayCouponJob } from './birthday-coupons.job'
import { runBorrowExpiryReminderJob } from './borrow-expiry-reminders.job'
import { runRenewalReminderJob } from './renewal-reminders.job'
import { runReportSchedulingJob } from './report-scheduling.job'
import { runReservationClaimExpiryJob } from './reservation-claim-expiry.job'

type JobDefinition = {
  name: string
  schedule: string
  handler: () => Promise<unknown>
}

const jobDefinitions: JobDefinition[] = [
  {
    name: 'job.renewal-reminders',
    schedule: '0 */6 * * *',
    handler: runRenewalReminderJob,
  },
  {
    name: 'job.birthday-coupons',
    schedule: '0 2 * * *',
    handler: runBirthdayCouponJob,
  },
  {
    name: 'job.borrow-expiry-reminders',
    schedule: '0 */4 * * *',
    handler: runBorrowExpiryReminderJob,
  },
  {
    name: 'job.reservation-claim-expiry',
    schedule: '*/30 * * * *',
    handler: runReservationClaimExpiryJob,
  },
  {
    name: 'job.report-scheduling',
    schedule: '*/10 * * * *',
    handler: runReportSchedulingJob,
  },
]

export const registerCronJobs = (): ScheduledTask[] => {
  return jobDefinitions.map((definition) => {
    const task = cron.schedule(definition.schedule, () => {
      void definition
        .handler()
        .then((result) => {
          logger.info('Cron job completed.', {
            job: definition.name,
            result,
          })
        })
        .catch((error) => {
          logger.error('Cron job failed.', {
            job: definition.name,
            error:
              error instanceof Error
                ? (error.stack ?? error.message)
                : String(error),
          })
        })
    })

    logger.info('Cron job registered.', {
      job: definition.name,
      schedule: definition.schedule,
    })

    return task
  })
}
