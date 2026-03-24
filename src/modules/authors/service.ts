import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from '../../common/utils/sanitize'
import type {
  AuthorsListQuery,
  CreateAuthorPayload,
  UpdateAuthorPayload,
} from './interface'
import { AuthorModel } from './model'
import { formatAuthor } from './utils'

const listAuthors = async (query: AuthorsListQuery) => {
  const pagination = getPaginationState(query)
  const filter: Record<string, unknown> = {}

  if (typeof query.isActive === 'boolean') {
    filter.isActive = query.isActive
  }

  if (query.search) {
    filter.$text = { $search: query.search }
  }

  const projection = query.search ? { score: { $meta: 'textScore' } } : {}

  const [authors, total] = await Promise.all([
    AuthorModel.find(filter, projection)
      .sort(
        query.search
          ? ({ score: { $meta: 'textScore' }, name: 1 } as const)
          : ({ name: 1, createdAt: -1 } as const),
      )
      .skip(pagination.skip)
      .limit(pagination.limit),
    AuthorModel.countDocuments(filter),
  ])

  return {
    meta: createPaginationMeta(pagination, total),
    data: authors.map((author) => formatAuthor(author)),
  }
}

const getAuthorById = async (id: string) => {
  const author = await AuthorModel.findById(id)
  return formatAuthor(author)
}
const createAuthor = async (payload: CreateAuthorPayload) => {
  const [existingName, existingSlug] = await Promise.all([
    AuthorModel.findOne({ name: payload.name }),
    AuthorModel.findOne({ slug: payload.slug }),
  ])

  if (existingName) {
    throw new AppError('Author with this name already exists.', 409)
  }

  if (existingSlug) {
    throw new AppError('Author slug already exists.', 409)
  }

  const author = await AuthorModel.create({
    name: sanitizeRequiredText(payload.name, 'Name', 2),
    slug: payload.slug,
    bio: sanitizeOptionalText(payload.bio),
    countryCode: payload.countryCode,
    avatar: payload.avatar,
    website: payload.website,
    isActive: payload.isActive,
  })

  return formatAuthor(author)
}
const updateAuthor = async (id: string, payload: UpdateAuthorPayload) => {
  const author = await AuthorModel.findById(id)

  if (!author) {
    throw new AppError('Author not found.', 404)
  }

  if (typeof payload.name === 'string') {
    const existing = await AuthorModel.findOne({
      name: payload.name,
      _id: { $ne: author._id },
    })

    if (existing) {
      throw new AppError('Author with this name already exists.', 409)
    }

    author.name = sanitizeRequiredText(payload.name, 'Name', 2)
  }

  if (typeof payload.slug === 'string') {
    const existing = await AuthorModel.findOne({
      slug: payload.slug,
      _id: { $ne: author._id },
    })

    if (existing) {
      throw new AppError('Author slug already exists.', 409)
    }

    author.slug = payload.slug
  }

  if (typeof payload.bio !== 'undefined') {
    author.bio = sanitizeOptionalText(payload.bio) ?? null
  }

  if (typeof payload.countryCode === 'string' || payload.countryCode === null) {
    author.countryCode = payload.countryCode
  }

  if (payload.avatar) {
    author.avatar = payload.avatar
  }

  if (typeof payload.website === 'string' || payload.website === null) {
    author.website = payload.website
  }

  if (typeof payload.isActive === 'boolean') {
    author.isActive = payload.isActive
  }

  await author.save()
  return formatAuthor(author)
}
const deleteAuthor = async (id: string) => {
  const author = await AuthorModel.findById(id)

  if (!author) {
    throw new AppError('Author not found.', 404)
  }

  await author.deleteOne()
}

export const authorsService = {
  listAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
}
