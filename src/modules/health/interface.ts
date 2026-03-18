export interface HealthQuery {
  details: boolean
}

export interface HealthData {
  status: 'ok'
  service: string
  environment: string
  version: string
  timestamp: string
  uptimeSeconds: number
  requestId: string
  checks?: {
    database: string
    memoryUsage: NodeJS.MemoryUsage
  }
}

export interface ReadinessData {
  status: 'ready' | 'not_ready'
  service: string
  database: string
  timestamp: string
}
