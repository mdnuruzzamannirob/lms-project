import { type Request, type RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { auditService } from '../audit/service'
import { reportsService } from './service'

const getStaffId = (request: Request): string => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth.sub
}

export const reportsController: Record<string, RequestHandler> = {
  createReportJob: catchAsync(async (request, response) => {
    const staffId = getStaffId(request)
    const body = request.body as {
      type:
        | 'admin_overview'
        | 'revenue_summary'
        | 'popular_books'
        | 'borrow_stats'
      format: 'json' | 'csv' | 'pdf' | 'excel'
      filters?: Record<string, unknown>
    }

    const result = await reportsService.createReportJob({
      staffId,
      type: body.type,
      format: body.format,
      ...(body.filters ? { filters: body.filters } : {}),
    })

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Report job queued successfully.',
      data: result,
    })
  }),

  listReportJobs: catchAsync(async (request, response) => {
    const query = request.query as unknown as {
      page: number
      limit: number
      status?: 'queued' | 'processing' | 'completed' | 'failed' | 'expired'
      type?:
        | 'admin_overview'
        | 'revenue_summary'
        | 'popular_books'
        | 'borrow_stats'
    }

    const result = await reportsService.listReportJobs(query)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Report jobs fetched successfully.',
      meta: result.meta,
      data: result.data,
    })
  }),

  getReportJob: catchAsync(async (request, response) => {
    const reportId = request.params.reportId as string
    const result = await reportsService.getReportJob(reportId)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Report job fetched successfully.',
      data: result,
    })
  }),

  downloadReport: catchAsync(async (request, response) => {
    const reportId = request.params.reportId as string
    const result = await reportsService.downloadReport(reportId)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Report downloaded successfully.',
      data: result,
    })
  }),

  adminOverviewSnapshot: catchAsync(async (_request, response) => {
    const result = await reportsService.getAdminOverviewSnapshot()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Admin overview fetched successfully.',
      data: result,
    })
  }),

  processPendingReports: catchAsync(async (request, response) => {
    const staffId = getStaffId(request)
    const processed = await reportsService.processQueuedReportsBatch(3)

    const ipAddress = request.socket.remoteAddress
    const userAgent = request.header('user-agent')

    await auditService.createLog({
      actorType: 'admin',
      actorId: staffId,
      action: 'reports.process-batch',
      module: 'reports',
      description: 'Manual report processing batch executed.',
      targetType: 'report-batch',
      meta: {
        processedCount: processed.length,
      },
      ...(request.id ? { requestId: request.id } : {}),
      ...(userAgent ? { userAgent } : {}),
      ...(ipAddress ? { ipAddress } : {}),
    })

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Pending reports processed.',
      data: {
        processedCount: processed.length,
        jobs: processed,
      },
    })
  }),
}
