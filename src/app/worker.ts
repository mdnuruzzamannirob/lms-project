import { auditService } from '../common/services/audit.service'
import { schedulerService } from '../common/services/scheduler.service'
import { config } from '../config'
import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { registerCronJobs } from '../jobs'
import { registerBackgroundWorkers } from '../workers'

let isShuttingDown = false
let cronTasks: Array<{ stop: () => void }> = []

const workerTick = async (): Promise<void> => {
  await auditService.logEvent({
    actor: { id: 'system-worker', type: 'system' },
    action: 'worker.tick',
    module: 'scheduler',
    description: 'Worker heartbeat executed.',
    meta: {
      uptimeSeconds: Number(process.uptime().toFixed(2)),
    },
  })
}

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info(`Worker received ${signal}. Starting graceful shutdown.`)

  try {
    cronTasks.forEach((task) => task.stop())
    cronTasks = []
    schedulerService.stopAllJobs()
    await disconnectFromDatabase()
    logger.info('Worker graceful shutdown completed.')
    process.exit(exitCode)
  } catch (error) {
    logger.error('Worker graceful shutdown failed.', {
      error:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
    })
    process.exit(1)
  }
}

const startWorker = async (): Promise<void> => {
  if (!config.worker.enabled) {
    logger.warn('Worker is disabled via WORKER_ENABLED=false. Exiting.')
    process.exit(0)
  }

  await connectToDatabase()

  registerBackgroundWorkers()

  schedulerService.registerJob({
    name: 'worker-heartbeat',
    intervalMs: config.worker.pollIntervalMs,
    handler: workerTick,
  })

  cronTasks = registerCronJobs()

  logger.info('Worker process started successfully', {
    environment: config.nodeEnv,
    intervalMs: config.worker.pollIntervalMs,
    jobs: schedulerService.getRegisteredJobs(),
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('unhandledRejection', (reason) => {
  logger.error('Worker unhandled promise rejection.', {
    error:
      reason instanceof Error
        ? (reason.stack ?? reason.message)
        : String(reason),
  })
  void shutdown('unhandledRejection', 1)
})

process.on('uncaughtException', (error) => {
  logger.error('Worker uncaught exception.', {
    error: error.stack ?? error.message,
  })
  void shutdown('uncaughtException', 1)
})

void startWorker().catch((error: unknown) => {
  logger.error('Failed to start worker process.', {
    error:
      error instanceof Error ? (error.stack ?? error.message) : String(error),
  })
  process.exit(1)
})
