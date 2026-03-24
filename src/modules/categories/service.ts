import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import { generateSlug } from '../../common/utils/generateSlug'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from '../../common/utils/sanitize'
import { BookModel } from '../books/model'
import type {
  CategoriesListQuery,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from './interface'
import { CategoryModel } from './model'
import {
  buildTree,
  countBooksPerCategory,
  ensureParentIsValid,
  formatCategory,
} from './utils'

const listCategories = async (query: CategoriesListQuery) => {
  const pagination = getPaginationState(query)
  const filter: Record<string, unknown> = {}

  if (!query.includeInactive) {
    filter.isActive = true
  }

  if (query.parentId) {
    filter.parentId = new Types.ObjectId(query.parentId)
  }

  if (query.search) {
    filter.$text = { $search: query.search }
  }

  const projection = query.search ? { score: { $meta: 'textScore' } } : {}

  if (query.tree) {
    const categories = await CategoryModel.find(filter).sort({
      sortOrder: 1,
      name: 1,
    })
    const counts = await countBooksPerCategory(categories)
    const treeData = buildTree(categories, counts)

    return {
      meta: {
        page: 1,
        limit: categories.length,
        total: categories.length,
        pages: 1,
      },
      data: treeData,
    }
  }

  const [categories, total] = await Promise.all([
    CategoryModel.find(filter, projection)
      .sort(
        query.search
          ? ({
              score: { $meta: 'textScore' },
              sortOrder: 1,
              name: 1,
            } as const)
          : ({ sortOrder: 1, name: 1 } as const),
      )
      .skip(pagination.skip)
      .limit(pagination.limit),
    CategoryModel.countDocuments(filter),
  ])

  const counts = await countBooksPerCategory(categories)

  return {
    meta: createPaginationMeta(pagination, total),
    data: categories.map((category) => {
      const id = category._id.toString()
      return formatCategory(category, counts.get(id) ?? 0)
    }),
  }
}

const getCategoryById = async (id: string) => {
  const category = await CategoryModel.findById(id)
  const booksCount = await BookModel.countDocuments({
    categoryIds: new Types.ObjectId(id),
  })

  return formatCategory(category, booksCount)
}

const createCategory = async (payload: CreateCategoryPayload) => {
  await ensureParentIsValid(undefined, payload.parentId)

  const slug = payload.slug ?? generateSlug(payload.name)

  const existingSlug = await CategoryModel.findOne({ slug })
  if (existingSlug) {
    throw new AppError('Category slug already exists.', 409)
  }

  const category = await CategoryModel.create({
    name: sanitizeRequiredText(payload.name, 'Name', 2),
    slug,
    description: sanitizeOptionalText(payload.description) ?? null,
    parentId: payload.parentId ? new Types.ObjectId(payload.parentId) : null,
    sortOrder: payload.sortOrder,
    isActive: payload.isActive,
  })

  return formatCategory(category, 0)
}

const updateCategory = async (id: string, payload: UpdateCategoryPayload) => {
  const category = await CategoryModel.findById(id)

  if (!category) {
    throw new AppError('Category not found.', 404)
  }

  if (typeof payload.parentId !== 'undefined') {
    await ensureParentIsValid(id, payload.parentId)
    category.parentId = payload.parentId
      ? new Types.ObjectId(payload.parentId)
      : null
  }

  if (typeof payload.slug === 'string') {
    const existingSlug = await CategoryModel.findOne({
      slug: payload.slug,
      _id: { $ne: category._id },
    })

    if (existingSlug) {
      throw new AppError('Category slug already exists.', 409)
    }

    category.slug = payload.slug
  }

  if (typeof payload.name === 'string') {
    category.name = sanitizeRequiredText(payload.name, 'Name', 2)
  }

  if (typeof payload.description !== 'undefined') {
    category.description = sanitizeOptionalText(payload.description) ?? null
  }

  if (typeof payload.sortOrder === 'number') {
    category.sortOrder = payload.sortOrder
  }

  if (typeof payload.isActive === 'boolean') {
    category.isActive = payload.isActive
  }

  await category.save()

  const booksCount = await BookModel.countDocuments({
    categoryIds: category._id,
  })

  return formatCategory(category, booksCount)
}

const deleteCategory = async (id: string) => {
  const category = await CategoryModel.findById(id)

  if (!category) {
    throw new AppError('Category not found.', 404)
  }

  const [childrenCount, booksCount] = await Promise.all([
    CategoryModel.countDocuments({ parentId: category._id }),
    BookModel.countDocuments({ categoryIds: category._id }),
  ])

  if (childrenCount > 0) {
    throw new AppError('Cannot delete category with child categories.', 400)
  }

  if (booksCount > 0) {
    throw new AppError('Cannot delete category linked to books.', 400)
  }

  await category.deleteOne()
}

export const categoriesService = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
}
