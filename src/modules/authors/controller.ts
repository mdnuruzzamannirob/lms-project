import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { authorsService } from './service'

const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const listAuthors: RequestHandler = catchAsync(
  async (request, response) => {
    const query = request.query as {
      page?: number
      limit?: number
      search?: string
      isActive?: boolean
    }

    const data = await authorsService.listAuthors(query)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Authors retrieved successfully.',
      data: data.data,
      meta: data.meta,
    })
  },
)

export const getAuthorById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authorsService.getAuthorById(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Author retrieved successfully.',
      data,
    })
  },
)

export const createAuthor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authorsService.createAuthor(request.body)

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Author created successfully.',
      data,
    })
  },
)

export const updateAuthor: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await authorsService.updateAuthor(
      getIdParam(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Author updated successfully.',
      data,
    })
  },
)

export const deleteAuthor: RequestHandler = catchAsync(
  async (request, response) => {
    await authorsService.deleteAuthor(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Author deleted successfully.',
      data: null,
    })
  },
)
