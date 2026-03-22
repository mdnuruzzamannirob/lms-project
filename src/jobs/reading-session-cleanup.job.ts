import { ReadingSessionModel } from '../modules/reading/model'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const runReadingSessionCleanupJob = async (): Promise<{
  deleted: number
}> => {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS)
  const result = await ReadingSessionModel.deleteMany({
    createdAt: { $lt: cutoff },
  })
  return { deleted: result.deletedCount }
}
