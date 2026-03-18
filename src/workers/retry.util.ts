import { logger } from '../config/logger'

type RetryOptions = {
  maxAttempts: number
  backoffMs: number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const executeWithRetry = async (
  workerName: string,
  handler: () => Promise<void>,
  options: RetryOptions = {
    maxAttempts: 3,
    backoffMs: 500,
  },
): Promise<void> => {
  let attempt = 1

  while (attempt <= options.maxAttempts) {
    try {
      await handler()

      if (attempt > 1) {
        logger.info('Worker completed after retry.', {
          worker: workerName,
          attempt,
        })
      }

      return
    } catch (error) {
      const isLastAttempt = attempt >= options.maxAttempts

      logger.warn('Worker attempt failed.', {
        worker: workerName,
        attempt,
        maxAttempts: options.maxAttempts,
        error: error instanceof Error ? error.message : String(error),
      })

      if (isLastAttempt) {
        logger.error('Worker failed after max retries.', {
          worker: workerName,
          error:
            error instanceof Error
              ? (error.stack ?? error.message)
              : String(error),
        })
        throw error
      }

      await wait(options.backoffMs * attempt)
      attempt += 1
    }
  }
}
