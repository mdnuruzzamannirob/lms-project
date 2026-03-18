import { type Request, type RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { auditService } from './service'

const getStaffAuth = (request: Request) => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth
}

const getClientIp = (request: Request): string | undefined => {
  const forwarded = request.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim()
  }

  return request.socket.remoteAddress
}

export const auditController: Record<string, RequestHandler> = {
  createActivityLog: catchAsync(async (request, response) => {
    const actor = getStaffAuth(request)
    const payload = request.body as {
      actorType: 'staff' | 'admin'
      action: string
      module: string
      description: string
      targetId?: string
      targetType?: string
      meta?: Record<string, unknown>
    }
    const ipAddress = getClientIp(request)
    const userAgent = request.header('user-agent')

    const result = await auditService.createLog({
      actorType: payload.actorType,
      actorId: actor.sub,
      action: payload.action,
      module: payload.module,
      description: payload.description,
      ...(actor.email ? { actorEmail: actor.email } : {}),
      ...(payload.targetId ? { targetId: payload.targetId } : {}),
      ...(payload.targetType ? { targetType: payload.targetType } : {}),
      ...(payload.meta ? { meta: payload.meta } : {}),
      ...(request.id ? { requestId: request.id } : {}),
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    })

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Audit log created successfully.',
      data: result,
    })
  }),

  listLogs: catchAsync(async (request, response) => {
    const query = request.query as unknown as {
      page: number
      limit: number
      actorType?: 'staff' | 'admin'
      module?: string
      action?: string
      from?: Date
      to?: Date
    }

    const result = await auditService.listLogs(query)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Audit logs fetched successfully.',
      meta: result.meta,
      data: result.data,
    })
  }),

  exportLogs: catchAsync(async (request, response) => {
    const query = request.query as unknown as {
      format: 'json' | 'csv'
      actorType?: 'staff' | 'admin'
      module?: string
      action?: string
      from?: Date
      to?: Date
    }

    const result = await auditService.exportLogs(query)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Audit logs exported successfully.',
      data: result,
    })
  }),
}
