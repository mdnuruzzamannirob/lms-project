import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import type {
  AuthorsListQuery,
  CreateAuthorPayload,
  UpdateAuthorPayload,
} from './interface'
import { authorsService } from './service'

const listAuthors: RequestHandler = catchAsync(async (request, response) => {
  const query = request.query as AuthorsListQuery

  const data = await authorsService.listAuthors(query)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Authors retrieved successfully.',
    data: data.data,
    meta: data.meta,
  })
})

const getAuthorById: RequestHandler = catchAsync(async (request, response) => {
  const data = await authorsService.getAuthorById(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Author retrieved successfully.',
    data,
  })
})

const createAuthor: RequestHandler = catchAsync(async (request, response) => {
  const data = await authorsService.createAuthor(
    request.body as CreateAuthorPayload,
  )

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Author created successfully.',
    data,
  })
})

const updateAuthor: RequestHandler = catchAsync(async (request, response) => {
  const data = await authorsService.updateAuthor(
    getIdParam(request),
    request.body as UpdateAuthorPayload,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Author updated successfully.',
    data,
  })
})

const deleteAuthor: RequestHandler = catchAsync(async (request, response) => {
  await authorsService.deleteAuthor(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Author deleted successfully.',
    data: null,
  })
})

export const authorsController = {
  listAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
}
