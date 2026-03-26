import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { auditService } from '../audit/service'
import { reportsAggregationService } from './aggregation.service'
import { MAX_REPORT_RETRIES } from './constants'
import type {
  IReportArtifact,
  ReportCreatePayload,
  ReportJobsListQuery,
} from './interface'
import { ReportArtifactModel, ReportJobModel } from './model'
import { processSingleJob, toJobResponse } from './utils'

const createReportJob = async (payload: ReportCreatePayload) => {
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
}

const listReportJobs = async (query: ReportJobsListQuery) => {
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
}

const getReportJob = async (reportId: string) => {
  const job = await ReportJobModel.findById(reportId)

  if (!job) {
    throw new AppError('Report job not found.', 404)
  }

  return toJobResponse(job)
}

const downloadReport = async (reportId: string) => {
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
}

const processNextQueuedReport = async () => {
  const next = await ReportJobModel.findOne({
    status: 'queued',
    attempts: { $lt: MAX_REPORT_RETRIES },
  }).sort({ createdAt: 1 })

  if (!next) {
    return null
  }

  await processSingleJob(next)

  return toJobResponse(next)
}

const processQueuedReportsBatch = async (batchSize = 5) => {
  const processed: Array<ReturnType<typeof toJobResponse>> = []

  for (let i = 0; i < batchSize; i += 1) {
    const result = await reportsService.processNextQueuedReport()
    if (!result) {
      break
    }
    processed.push(result)
  }

  return processed
}

const getAdminOverviewSnapshot = async () => {
  return reportsAggregationService.getAdminOverview()
}

const getReportArtifactByJobId = async (jobId: string) => {
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
}

export const reportsService = {
  createReportJob,
  listReportJobs,
  getReportJob,
  downloadReport,
  processNextQueuedReport,
  processQueuedReportsBatch,
  getAdminOverviewSnapshot,
  getReportArtifactByJobId,
}
