import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import type {
  AuthorsListQuery,
  CreateAuthorPayload,
  IAuthor,
  UpdateAuthorPayload,
} from './interface'
import { AuthorModel } from './model'

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

const formatAuthor = (author: IAuthor | null) => {
  if (!author) {
    throw new AppError('Author not found.', 404)
  }

  return {
    id: author._id.toString(),
    name: author.name,
    slug: author.slug,
    bio: author.bio,
    countryCode: author.countryCode,
    avatar: author.avatar ?? null,
    website: author.website,
    isActive: author.isActive,
    createdAt: author.createdAt.toISOString(),
    updatedAt: author.updatedAt.toISOString(),
  }
}

export const authorsService = {
  listAuthors: async (query: AuthorsListQuery) => {
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
  },

  getAuthorById: async (id: string) => {
    const author = await AuthorModel.findById(id)
    return formatAuthor(author)
  },

  createAuthor: async (payload: CreateAuthorPayload) => {
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
  },

  updateAuthor: async (id: string, payload: UpdateAuthorPayload) => {
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

    if (
      typeof payload.countryCode === 'string' ||
      payload.countryCode === null
    ) {
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
  },

  deleteAuthor: async (id: string) => {
    const author = await AuthorModel.findById(id)

    if (!author) {
      throw new AppError('Author not found.', 404)
    }

    await author.deleteOne()
  },
}
