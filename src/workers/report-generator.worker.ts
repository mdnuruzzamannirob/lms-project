import { logger } from '../config/logger'
import { reportsService } from '../modules/reports/service'
import { executeWithRetry } from './retry.util'

export const runReportGeneratorWorker = async (): Promise<void> => {
  await executeWithRetry(
    'report-generator',
    async () => {
      const processed = await reportsService.processQueuedReportsBatch(5)

      if (processed.length) {
        logger.info('Report generator worker processed jobs.', {
          count: processed.length,
          jobIds: processed.map((job) => job.id),
        })
      }
    },
    {
      maxAttempts: 3,
      backoffMs: 800,
    },
  )
}
