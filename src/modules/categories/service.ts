import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { BookModel } from '../books/model'
import type {
  CategoriesListQuery,
  CategoryTreeNode,
  CreateCategoryPayload,
  FormattedCategory,
  ICategory,
  UpdateCategoryPayload,
} from './interface'
import { CategoryModel } from './model'

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const sanitizeRequiredText = (
  value: string,
  fieldName: string,
  minLength = 1,
) => {
  const sanitized = stripHtml(value)

  if (sanitized.length < minLength) {
    throw new AppError(`${fieldName} is invalid after sanitization.`, 400)
  }

  return sanitized
}

const sanitizeOptionalText = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return value
  }

  const sanitized = stripHtml(value)
  return sanitized.length > 0 ? sanitized : null
}

const generateSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const formatCategory = (
  category: ICategory | null,
  booksCount = 0,
): FormattedCategory => {
  if (!category) {
    throw new AppError('Category not found.', 404)
  }

  const parentId = category.parentId?.toString()
  const description = category.description

  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    ...(description ? { description } : {}),
    ...(parentId ? { parentId, parent_id: parentId } : {}),
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    booksCount,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

const ensureParentIsValid = async (
  selfId: string | undefined,
  parentId: string | undefined,
) => {
  if (!parentId) {
    return
  }

  if (selfId && selfId === parentId) {
    throw new AppError('A category cannot be parent of itself.', 400)
  }

  const parent = await CategoryModel.findById(parentId)

  if (!parent) {
    throw new AppError('Parent category not found.', 404)
  }

  if (selfId) {
    const ancestors = await CategoryModel.aggregate<{
      ancestors: Array<{ _id: Types.ObjectId }>
    }>([
      { $match: { _id: parent._id } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$parentId',
          connectFromField: 'parentId',
          connectToField: '_id',
          as: 'ancestors',
        },
      },
    ])

    const hasCycle = (ancestors[0]?.ancestors ?? []).some(
      (node) => node._id.toString() === selfId,
    )

    if (hasCycle) {
      throw new AppError('Category hierarchy cycle is not allowed.', 400)
    }
  }
}

const buildTree = (
  categories: ICategory[],
  countsByCategoryId: Map<string, number>,
) => {
  const nodeMap = new Map<string, CategoryTreeNode>()
  const parentMap = new Map<string, string | undefined>()

  categories.forEach((category) => {
    const id = category._id.toString()
    parentMap.set(id, category.parentId?.toString())
    nodeMap.set(id, {
      ...formatCategory(category, countsByCategoryId.get(id) ?? 0),
      children: [],
    })
  })

  const roots: CategoryTreeNode[] = []

  nodeMap.forEach((node, id) => {
    const parentId = parentMap.get(id)

    if (parentId) {
      const parent = nodeMap.get(parentId)

      if (parent) {
        parent.children.push(node)
        return
      }
    }

    roots.push(node)
  })

  const sortChildren = (items: CategoryTreeNode[]) => {
    items.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.name.localeCompare(b.name)
    })

    items.forEach((item) => sortChildren(item.children))
  }

  sortChildren(roots)
  return roots
}

const countBooksPerCategory = async (categories: ICategory[]) => {
  if (!categories.length) {
    return new Map<string, number>()
  }

  const categoryObjectIds = categories.map((category) => category._id)
  const rows: Array<{ _id: Types.ObjectId; count: number }> =
    await BookModel.aggregate([
      { $match: { categoryIds: { $in: categoryObjectIds } } },
      { $unwind: '$categoryIds' },
      { $match: { categoryIds: { $in: categoryObjectIds } } },
      { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
    ])

  const map = new Map<string, number>()
  rows.forEach((row) => {
    map.set(row._id.toString(), row.count)
  })

  return map
}

export const categoriesService = {
  listCategories: async (query: CategoriesListQuery) => {
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
  },

  getCategoryById: async (id: string) => {
    const category = await CategoryModel.findById(id)
    const booksCount = await BookModel.countDocuments({
      categoryIds: new Types.ObjectId(id),
    })

    return formatCategory(category, booksCount)
  },

  createCategory: async (payload: CreateCategoryPayload) => {
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
  },

  updateCategory: async (id: string, payload: UpdateCategoryPayload) => {
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
  },

  deleteCategory: async (id: string) => {
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
  },
}
