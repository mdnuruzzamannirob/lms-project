import type { Types } from 'mongoose'

export interface ICategory {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string | null
  parentId: Types.ObjectId | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CategoriesListQuery {
  page?: number
  limit?: number
  search?: string
  includeInactive?: boolean
  tree?: boolean
  parentId?: string
}

export interface CreateCategoryPayload {
  name: string
  slug?: string
  description?: string
  parentId?: string
  sortOrder: number
  isActive: boolean
}

export type UpdateCategoryPayload = Partial<{
  name: string
  slug: string
  description: string
  parentId: string
  sortOrder: number
  isActive: boolean
}>

export interface FormattedCategory {
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

export type CategoryTreeNode = FormattedCategory & {
  children: CategoryTreeNode[]
}
