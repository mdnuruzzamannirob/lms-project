import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { BookModel } from '../books/model'
import type { ICategory } from './interface'
import { CategoryModel } from './model'

type FormattedCategory = {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  parent_id?: string
  sortOrder: number
  isActive: boolean
  booksCount: number
  createdAt: string
  updatedAt: string
}

type CategoryTreeNode = FormattedCategory & { children: CategoryTreeNode[] }

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
    let currentParentId: string | undefined = parent.parentId?.toString()

    while (currentParentId) {
      if (currentParentId === selfId) {
        throw new AppError('Category hierarchy cycle is not allowed.', 400)
      }

      const currentParent = await CategoryModel.findById(currentParentId)
      currentParentId = currentParent?.parentId?.toString()
    }
  }
}

const buildTree = (
  categories: ICategory[],
  countsByCategoryId: Map<string, number>,
) => {
  const nodeMap = new Map<string, CategoryTreeNode>()

  categories.forEach((category) => {
    const id = category._id.toString()
    nodeMap.set(id, {
      ...formatCategory(category, countsByCategoryId.get(id) ?? 0),
      children: [],
    })
  })

  const roots: CategoryTreeNode[] = []

  nodeMap.forEach((node, id) => {
    const parentId = categories
      .find((category) => category._id.toString() === id)
      ?.parentId?.toString()

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
  listCategories: async (query: {
    page?: number
    limit?: number
    search?: string
    includeInactive?: boolean
    tree?: boolean
    parentId?: string
  }) => {
    const pagination = getPaginationState(query)
    const filter: Record<string, unknown> = {}

    if (!query.includeInactive) {
      filter.isActive = true
    }

    if (query.parentId) {
      filter.parentId = new Types.ObjectId(query.parentId)
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { slug: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ]
    }

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
      CategoryModel.find(filter)
        .sort({ sortOrder: 1, name: 1 })
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

  createCategory: async (payload: {
    name: string
    slug: string
    description?: string
    parentId?: string
    sortOrder: number
    isActive: boolean
  }) => {
    await ensureParentIsValid(undefined, payload.parentId)

    const existingSlug = await CategoryModel.findOne({ slug: payload.slug })
    if (existingSlug) {
      throw new AppError('Category slug already exists.', 409)
    }

    const category = await CategoryModel.create({
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      parentId: payload.parentId
        ? new Types.ObjectId(payload.parentId)
        : undefined,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    })

    return formatCategory(category, 0)
  },

  updateCategory: async (
    id: string,
    payload: Partial<{
      name: string
      slug: string
      description: string
      parentId: string
      sortOrder: number
      isActive: boolean
    }>,
  ) => {
    const category = await CategoryModel.findById(id)

    if (!category) {
      throw new AppError('Category not found.', 404)
    }

    if (typeof payload.parentId !== 'undefined') {
      await ensureParentIsValid(id, payload.parentId)
      category.parentId = payload.parentId
        ? new Types.ObjectId(payload.parentId)
        : undefined
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
      category.name = payload.name
    }

    if (typeof payload.description === 'string') {
      category.description = payload.description
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
