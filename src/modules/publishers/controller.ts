import type { RequestHandler } from 'express'
import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import type {
  CreatePublisherPayload,
  PublishersListQuery,
  UpdatePublisherPayload,
} from './interface'
import { publishersService } from './service'

const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const publishersController = {
  listPublishers: catchAsync(async (req, res) => {
    const result = await publishersService.listPublishers(
      req.query as PublishersListQuery,
    )
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Publishers retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }) as RequestHandler,

  getPublisher: catchAsync(async (req, res) => {
    const result = await publishersService.getPublisherById(getIdParam(req))
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Publisher retrieved successfully.',
      data: result,
    })
  }) as RequestHandler,

  createPublisher: catchAsync(async (req, res) => {
    const result = await publishersService.createPublisher(
      req.body as CreatePublisherPayload,
    )
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Publisher created successfully.',
      data: result,
    })
  }) as RequestHandler,

  updatePublisher: catchAsync(async (req, res) => {
    const result = await publishersService.updatePublisher(
      getIdParam(req),
      req.body as UpdatePublisherPayload,
    )
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Publisher updated successfully.',
      data: result,
    })
  }) as RequestHandler,

  deletePublisher: catchAsync(async (req, res) => {
    await publishersService.deletePublisher(getIdParam(req))
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Publisher deleted successfully.',
      data: null,
    })
  }) as RequestHandler,
}
