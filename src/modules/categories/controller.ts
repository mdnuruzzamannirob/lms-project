import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import type {
  CategoriesListQuery,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from './interface'
import { categoriesService } from './service'

const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const listCategories: RequestHandler = catchAsync(
  async (request, response) => {
    const query = request.query as CategoriesListQuery

    const result = await categoriesService.listCategories(query)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Categories retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

export const getCategoryById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await categoriesService.getCategoryById(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Category retrieved successfully.',
      data,
    })
  },
)

export const createCategory: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await categoriesService.createCategory(
      request.body as CreateCategoryPayload,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Category created successfully.',
      data,
    })
  },
)

export const updateCategory: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await categoriesService.updateCategory(
      getIdParam(request),
      request.body as UpdateCategoryPayload,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Category updated successfully.',
      data,
    })
  },
)

export const deleteCategory: RequestHandler = catchAsync(
  async (request, response) => {
    await categoriesService.deleteCategory(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Category deleted successfully.',
      data: null,
    })
  },
)
