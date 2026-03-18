import { config } from '../../config'
import { getDatabaseState } from '../../config/db'
import type { HealthData, HealthQuery, ReadinessData } from './interface'

export const getHealthReport = (
  query: HealthQuery,
  requestId: string,
): HealthData => {
  const baseReport: HealthData = {
    status: 'ok',
    service: 'library-management-system-backend',
    environment: config.nodeEnv,
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    requestId,
  }

  if (!query.details) {
    return baseReport
  }

  return {
    ...baseReport,
    checks: {
      database: getDatabaseState(),
      memoryUsage: process.memoryUsage(),
    },
  }
}

export const getLivenessReport = (): Omit<
  HealthData,
  'checks' | 'requestId' | 'uptimeSeconds' | 'environment' | 'version'
> & { timestamp: string } => ({
  status: 'ok',
  service: 'library-management-system-backend',
  timestamp: new Date().toISOString(),
})

export const getReadinessReport = (): {
  statusCode: number
  body: ReadinessData
} => {
  const database = getDatabaseState()
  const isReady = database === 'connected'

  return {
    statusCode: isReady ? 200 : 503,
    body: {
      status: isReady ? 'ready' : 'not_ready',
      service: 'library-management-system-backend',
      database,
      timestamp: new Date().toISOString(),
    },
  }
}
