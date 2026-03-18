import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { auditService } from '../audit/service'
import { reportsAggregationService } from './aggregation.service'
import type {
  IReportArtifact,
  ReportCreatePayload,
  ReportType,
} from './interface'
import { ReportArtifactModel, ReportJobModel } from './model'

const REPORT_FILE_EXPIRY_DAYS = 7
const MAX_REPORT_RETRIES = 3

const getReportExpiryDate = (): Date => {
  return new Date(Date.now() + REPORT_FILE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}

const toJobResponse = (job: any) => {
  return {
    id: job._id.toString(),
    requestedByStaffId: job.requestedByStaffId.toString(),
    type: job.type,
    format: job.format,
    filters: job.filters,
    status: job.status,
    attempts: job.attempts,
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    failedAt: job.failedAt?.toISOString(),
    lastError: job.lastError,
    expiresAt: job.expiresAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }
}

const escapeCsv = (value: unknown): string => {
  const raw = String(value ?? '')
  if (/[,\n\"]/g.test(raw)) {
    return `"${raw.replace(/\"/g, '""')}"`
  }
  return raw
}

const toCsv = (data: unknown): { content: string; rowCount: number } => {
  if (Array.isArray(data)) {
    if (!data.length) {
      return { content: '', rowCount: 0 }
    }

    const rows = data as Array<Record<string, unknown>>
    const headers = Object.keys(rows[0] ?? {})
    const contentRows = rows.map((row) =>
      headers.map((key) => escapeCsv(row[key])).join(','),
    )

    return {
      content: [headers.join(','), ...contentRows].join('\n'),
      rowCount: rows.length,
    }
  }

  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).map(
      ([key, value]) => `${escapeCsv(key)},${escapeCsv(JSON.stringify(value))}`,
    )

    return {
      content: ['key,value', ...entries].join('\n'),
      rowCount: entries.length,
    }
  }

  return {
    content: `value\n${escapeCsv(data)}`,
    rowCount: 1,
  }
}

const createArtifact = async (job: any, reportData: unknown) => {
  const expiresAt = getReportExpiryDate()
  const fileName = `${job.type}-${job._id.toString()}.${job.format === 'csv' ? 'csv' : 'json'}`

  const serialized =
    job.format === 'csv'
      ? toCsv(reportData)
      : {
          content: JSON.stringify(reportData, null, 2),
          rowCount: Array.isArray(reportData) ? reportData.length : 1,
        }

  const artifact = await ReportArtifactModel.findOneAndUpdate(
    {
      reportJobId: job._id,
    },
    {
      $set: {
        fileName,
        mimeType: job.format === 'csv' ? 'text/csv' : 'application/json',
        content: serialized.content,
        rowCount: serialized.rowCount,
        expiresAt,
      },
    },
    {
      upsert: true,
      new: true,
    },
  )

  job.status = 'completed'
  job.completedAt = new Date()
  job.failedAt = undefined
  job.lastError = undefined
  job.expiresAt = expiresAt
  await job.save()

  return artifact
}

const processSingleJob = async (job: any) => {
  try {
    job.status = 'processing'
    job.startedAt = new Date()
    job.attempts += 1
    await job.save()

    const reportData = await reportsAggregationService.buildReportData(
      job.type as ReportType,
      (job.filters ?? {}) as Record<string, unknown>,
    )

    const artifact = await createArtifact(job, reportData)

    await auditService.createLog({
      actorType: 'admin',
      actorId: job.requestedByStaffId.toString(),
      action: 'reports.generated',
      module: 'reports',
      description: `Report job ${job._id.toString()} generated successfully.`,
      targetId: job._id.toString(),
      targetType: 'report-job',
      meta: {
        reportType: job.type,
        format: job.format,
        rowCount: artifact.rowCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    job.lastError = message
    job.failedAt = new Date()

    if (job.attempts >= MAX_REPORT_RETRIES) {
      job.status = 'failed'
    } else {
      job.status = 'queued'
    }

    await job.save()
  }
}

export const reportsService = {
  createReportJob: async (payload: ReportCreatePayload) => {
    const created = await ReportJobModel.create({
      requestedByStaffId: new Types.ObjectId(payload.staffId),
      type: payload.type,
      format: payload.format,
      filters: payload.filters ?? {},
      status: 'queued',
      attempts: 0,
    })

    await auditService.createLog({
      actorType: 'admin',
      actorId: payload.staffId,
      action: 'reports.create',
      module: 'reports',
      description: `Report job ${created._id.toString()} queued.`,
      targetId: created._id.toString(),
      targetType: 'report-job',
      meta: {
        type: payload.type,
        format: payload.format,
      },
    })

    return toJobResponse(created)
  },

  listReportJobs: async (query: {
    page: number
    limit: number
    status?: 'queued' | 'processing' | 'completed' | 'failed' | 'expired'
    type?:
      | 'admin_overview'
      | 'revenue_summary'
      | 'popular_books'
      | 'borrow_stats'
  }) => {
    const filter: Record<string, unknown> = {}

    if (query.status) {
      filter.status = query.status
    }

    if (query.type) {
      filter.type = query.type
    }

    const pagination = getPaginationState(query)

    const [jobs, total] = await Promise.all([
      ReportJobModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      ReportJobModel.countDocuments(filter),
    ])

    return {
      meta: createPaginationMeta(pagination, total),
      data: jobs.map((job) => toJobResponse(job)),
    }
  },

  getReportJob: async (reportId: string) => {
    const job = await ReportJobModel.findById(reportId)

    if (!job) {
      throw new AppError('Report job not found.', 404)
    }

    return toJobResponse(job)
  },

  downloadReport: async (reportId: string) => {
    const job = await ReportJobModel.findById(reportId)

    if (!job) {
      throw new AppError('Report job not found.', 404)
    }

    if (job.status !== 'completed') {
      throw new AppError('Report is not ready for download.', 400)
    }

    if (!job.expiresAt || job.expiresAt.getTime() < Date.now()) {
      job.status = 'expired'
      await job.save()
      throw new AppError('Report file has expired.', 410)
    }

    const artifact = await ReportArtifactModel.findOne({
      reportJobId: new Types.ObjectId(reportId),
    })

    if (!artifact) {
      throw new AppError('Report artifact not found.', 404)
    }

    return {
      reportId,
      fileName: artifact.fileName,
      mimeType: artifact.mimeType,
      content: artifact.content,
      rowCount: artifact.rowCount,
      expiresAt: artifact.expiresAt.toISOString(),
      createdAt: artifact.createdAt.toISOString(),
    }
  },

  processNextQueuedReport: async () => {
    const next = await ReportJobModel.findOne({
      status: 'queued',
      attempts: { $lt: MAX_REPORT_RETRIES },
    }).sort({ createdAt: 1 })

    if (!next) {
      return null
    }

    await processSingleJob(next)

    return toJobResponse(next)
  },

  processQueuedReportsBatch: async (batchSize = 5) => {
    const processed: Array<ReturnType<typeof toJobResponse>> = []

    for (let i = 0; i < batchSize; i += 1) {
      const result = await reportsService.processNextQueuedReport()
      if (!result) {
        break
      }
      processed.push(result)
    }

    return processed
  },

  getAdminOverviewSnapshot: async () => {
    return reportsAggregationService.getAdminOverview()
  },

  getReportArtifactByJobId: async (jobId: string) => {
    const artifact = await ReportArtifactModel.findOne({
      reportJobId: new Types.ObjectId(jobId),
    })

    if (!artifact) {
      throw new AppError('Report artifact not found.', 404)
    }

    const typedArtifact = artifact as IReportArtifact

    return {
      id: typedArtifact._id.toString(),
      fileName: typedArtifact.fileName,
      mimeType: typedArtifact.mimeType,
      rowCount: typedArtifact.rowCount,
      expiresAt: typedArtifact.expiresAt.toISOString(),
      createdAt: typedArtifact.createdAt.toISOString(),
    }
  },
}
