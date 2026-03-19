import http from 'node:http'

import { config } from '../config'
import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { healthService } from '../modules/health'
import { rbacService } from '../modules/rbac'
import { app } from './app'

let server: http.Server | undefined
let isShuttingDown = false

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info(`Received ${signal}. Starting graceful shutdown.`)

  try {
    const shutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout reached. Forcing process exit.', {
        timeoutMs: config.worker.shutdownTimeoutMs,
      })
      process.exit(1)
    }, config.worker.shutdownTimeoutMs)

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
    }

    await disconnectFromDatabase()
    clearTimeout(shutdownTimer)
    logger.info('Graceful shutdown completed.')
    process.exit(exitCode)
  } catch (error) {
    logger.error('Graceful shutdown failed.', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

const startServer = async (): Promise<void> => {
  await connectToDatabase()
  const readiness = healthService.getReadinessReport()
  if (readiness.statusCode !== 200) {
    throw new Error('Health readiness check failed during startup.')
  }
  await rbacService.ensurePermissionSeed()

  server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`, {
      environment: config.nodeEnv,
      apiPrefix: config.apiPrefix,
    })
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection.', {
    error:
      reason instanceof Error
        ? (reason.stack ?? reason.message)
        : String(reason),
  })
  void shutdown('unhandledRejection', 1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception.', { error: error.stack ?? error.message })
  void shutdown('uncaughtException', 1)
})

void startServer().catch((error: unknown) => {
  logger.error('Failed to start server.', {
    error:
      error instanceof Error ? (error.stack ?? error.message) : String(error),
  })
  process.exit(1)
})
