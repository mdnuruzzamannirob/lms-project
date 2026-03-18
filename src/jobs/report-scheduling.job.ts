import { reportsService } from '../modules/reports/service'

export const runReportSchedulingJob = async (): Promise<{
  processed: number
}> => {
  const processed = await reportsService.processQueuedReportsBatch(10)
  return { processed: processed.length }
}
