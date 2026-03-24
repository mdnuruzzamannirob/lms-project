import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import type {
  CategoriesListQuery,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from './interface'
import { categoriesService } from './service'

const listCategories: RequestHandler = catchAsync(async (request, response) => {
  const query = request.query as CategoriesListQuery

  const result = await categoriesService.listCategories(query)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Categories retrieved successfully.',
    data: result.data,
    meta: result.meta,
  })
})

const getCategoryById: RequestHandler = catchAsync(
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

const createCategory: RequestHandler = catchAsync(async (request, response) => {
  const data = await categoriesService.createCategory(
    request.body as CreateCategoryPayload,
  )

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Category created successfully.',
    data,
  })
})

const updateCategory: RequestHandler = catchAsync(async (request, response) => {
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
})

const deleteCategory: RequestHandler = catchAsync(async (request, response) => {
  await categoriesService.deleteCategory(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Category deleted successfully.',
    data: null,
  })
})

export const categoriesController = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
}
