import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import type {
  CreatePublisherPayload,
  PublishersListQuery,
  UpdatePublisherPayload,
} from './interface'
import { publishersService } from './service'

const listPublishers = catchAsync(async (req, res) => {
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
})

const getPublisher = catchAsync(async (req, res) => {
  const result = await publishersService.getPublisherById(getIdParam(req))
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Publisher retrieved successfully.',
    data: result,
  })
})

const createPublisher = catchAsync(async (req, res) => {
  const result = await publishersService.createPublisher(
    req.body as CreatePublisherPayload,
  )
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Publisher created successfully.',
    data: result,
  })
})

const updatePublisher = catchAsync(async (req, res) => {
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
})

const deletePublisher = catchAsync(async (req, res) => {
  await publishersService.deletePublisher(getIdParam(req))
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Publisher deleted successfully.',
    data: null,
  })
})

export const publishersController = {
  listPublishers,
  getPublisher,
  createPublisher,
  updatePublisher,
  deletePublisher,
}
