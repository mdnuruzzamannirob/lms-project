import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getBookId, getEntityId, getUserId } from '../../common/utils/getId'
import { sendResponse } from '../../common/utils/sendResponse'
import { readingService } from './service'

const startReading: RequestHandler = catchAsync(async (request, response) => {
  const data = await readingService.startReading(
    getUserId(request),
    getBookId(request),
    request.body,
  )

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Reading started successfully.',
    data,
  })
})

const createReadingSession: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await readingService.createReadingSession(
      getUserId(request),
      getBookId(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Reading session saved successfully.',
      data,
    })
  },
)

const updateReadingProgress: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await readingService.updateReadingProgress(
      getUserId(request),
      getBookId(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Reading progress updated successfully.',
      data,
    })
  },
)

const getReadingHistory: RequestHandler = catchAsync(
  async (request, response) => {
    const result = await readingService.getReadingHistory(
      getUserId(request),
      request.query as { page?: number; limit?: number },
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Reading history retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

const getCurrentlyReading: RequestHandler = catchAsync(
  async (request, response) => {
    const result = await readingService.getCurrentlyReading(
      getUserId(request),
      request.query as { page?: number; limit?: number },
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Currently reading list retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

const getCompletedReading: RequestHandler = catchAsync(
  async (request, response) => {
    const result = await readingService.getCompletedReading(
      getUserId(request),
      request.query as { page?: number; limit?: number },
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Completed reading list retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

const listBookmarks: RequestHandler = catchAsync(async (request, response) => {
  const data = await readingService.listBookmarks(
    getUserId(request),
    getBookId(request),
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Bookmarks retrieved successfully.',
    data,
  })
})

const createBookmark: RequestHandler = catchAsync(async (request, response) => {
  const data = await readingService.createBookmark(
    getUserId(request),
    getBookId(request),
    request.body,
  )

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Bookmark created successfully.',
    data,
  })
})

const updateBookmark: RequestHandler = catchAsync(async (request, response) => {
  const data = await readingService.updateBookmark(
    getUserId(request),
    getBookId(request),
    getEntityId(request),
    request.body,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Bookmark updated successfully.',
    data,
  })
})

const deleteBookmark: RequestHandler = catchAsync(async (request, response) => {
  await readingService.deleteBookmark(
    getUserId(request),
    getBookId(request),
    getEntityId(request),
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Bookmark deleted successfully.',
    data: null,
  })
})

const listHighlights: RequestHandler = catchAsync(async (request, response) => {
  const data = await readingService.listHighlights(
    getUserId(request),
    getBookId(request),
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Highlights retrieved successfully.',
    data,
  })
})

const createHighlight: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await readingService.createHighlight(
      getUserId(request),
      getBookId(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Highlight created successfully.',
      data,
    })
  },
)

const updateHighlight: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await readingService.updateHighlight(
      getUserId(request),
      getBookId(request),
      getEntityId(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Highlight updated successfully.',
      data,
    })
  },
)

const deleteHighlight: RequestHandler = catchAsync(
  async (request, response) => {
    await readingService.deleteHighlight(
      getUserId(request),
      getBookId(request),
      getEntityId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Highlight deleted successfully.',
      data: null,
    })
  },
)

export const readingController = {
  startReading,
  createReadingSession,
  updateReadingProgress,
  getReadingHistory,
  getCurrentlyReading,
  getCompletedReading,
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  listHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
}
