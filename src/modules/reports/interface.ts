import type { Types } from 'mongoose'

export type ReportType =
  | 'admin_overview'
  | 'revenue_summary'
  | 'popular_books'
  | 'reading_stats'
  | 'subscription_stats'

export type ReportFormat = 'json' | 'csv' | 'pdf' | 'excel'

export type ReportStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'

export interface IReportJob {
  _id: Types.ObjectId
  requestedByStaffId: Types.ObjectId
  type: ReportType
  format: ReportFormat
  filters: Record<string, unknown>
  status: ReportStatus
  attempts: number
  startedAt: Date | undefined
  completedAt: Date | undefined
  failedAt: Date | undefined
  lastError: string | undefined
  expiresAt: Date | undefined
  createdAt: Date
  updatedAt: Date
}

export interface IReportArtifact {
  _id: Types.ObjectId
  reportJobId: Types.ObjectId
  fileName: string
  mimeType: string
  content: string
  rowCount: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export type ReportCreatePayload = {
  staffId: string
  type: ReportType
  format: ReportFormat
  filters?: Record<string, unknown>
}

export interface ReportJobsListQuery {
  page: number
  limit: number
  status?: ReportStatus
  type?: ReportType
}

export type AdminOverviewAggregation = {
  totals: {
    users: number
    activeSubscriptions: number
    revenue: number
  }
  popularBooks: Array<{
    bookId: string
    title: string
    readCount: number
  }>
  readingStats: {
    totalReadingSessions: number
    totalReadingTimeSeconds: number
  }
}
