import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { booksService } from './service'

const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

const getFileIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const fileId = request.params.fid

  if (typeof fileId !== 'string') {
    throw new AppError('Invalid file id parameter.', 400)
  }

  return fileId
}

const getStaffId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth.sub
}

export const listPublicBooks: RequestHandler = catchAsync(
  async (request, response) => {
    const query = request.query as {
      page?: number
      limit?: number
      search?: string
      featured?: boolean
      isAvailable?: boolean
      authorId?: string
      categoryId?: string
    }

    const result = await booksService.listPublicBooks(query)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Books retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

export const listFeaturedBooks: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await booksService.listFeaturedBooks()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Featured books retrieved successfully.',
      data,
    })
  },
)

export const getPublicBookById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.getPublicBookById(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book retrieved successfully.',
      data,
    })
  },
)

export const getBookPreview: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.getBookPreview(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book preview retrieved successfully.',
      data,
    })
  },
)

export const getBookReviewSummary: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.getBookReviewSummary(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book review summary retrieved successfully.',
      data,
    })
  },
)

export const createBook: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.createBook(
      getStaffId(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Book created successfully.',
      data,
    })
  },
)

export const updateBook: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.updateBook(
      getIdParam(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book updated successfully.',
      data,
    })
  },
)

export const deleteBook: RequestHandler = catchAsync(
  async (request, response) => {
    await booksService.deleteBook(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book deleted successfully.',
      data: null,
    })
  },
)

export const setBookFeatured: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.setBookFeatured(
      getIdParam(request),
      request.body.featured,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book featured status updated successfully.',
      data,
    })
  },
)

export const setBookAvailability: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.setBookAvailability(
      getIdParam(request),
      request.body.isAvailable,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book availability updated successfully.',
      data,
    })
  },
)

export const addBookFile: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.addBookFile(
      getIdParam(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Book file metadata saved successfully.',
      data,
    })
  },
)

export const deleteBookFile: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.deleteBookFile(
      getIdParam(request),
      getFileIdParam(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book file removed successfully.',
      data,
    })
  },
)

export const bulkImportBooks: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await booksService.bulkImportBooks(
      getStaffId(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Book import processed successfully.',
      data,
    })
  },
)
