import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import type { IAuthor } from './interface'
import { AuthorModel } from './model'

const formatAuthor = (author: IAuthor | null) => {
  if (!author) {
    throw new AppError('Author not found.', 404)
  }

  return {
    id: author._id.toString(),
    name: author.name,
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
  listAuthors: async (query: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) => {
    const pagination = getPaginationState(query)
    const filter: Record<string, unknown> = {}

    if (typeof query.isActive === 'boolean') {
      filter.isActive = query.isActive
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { bio: { $regex: query.search, $options: 'i' } },
      ]
    }

    const [authors, total] = await Promise.all([
      AuthorModel.find(filter)
        .sort({ name: 1, createdAt: -1 })
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

  createAuthor: async (payload: {
    name: string
    bio?: string
    countryCode?: string
    avatar?: { publicId: string; url: string }
    website?: string
    isActive: boolean
  }) => {
    const existing = await AuthorModel.findOne({ name: payload.name })

    if (existing) {
      throw new AppError('Author with this name already exists.', 409)
    }

    const author = await AuthorModel.create({
      name: payload.name,
      bio: payload.bio,
      countryCode: payload.countryCode,
      avatar: payload.avatar,
      website: payload.website,
      isActive: payload.isActive,
    })

    return formatAuthor(author)
  },

  updateAuthor: async (
    id: string,
    payload: Partial<{
      name: string
      bio: string
      countryCode: string
      avatar: { publicId: string; url: string }
      website: string
      isActive: boolean
    }>,
  ) => {
    const author = await AuthorModel.findById(id)

    if (!author) {
      throw new AppError('Author not found.', 404)
    }

    if (typeof payload.name === 'string') {
      author.name = payload.name
    }

    if (typeof payload.bio === 'string') {
      author.bio = payload.bio
    }

    if (typeof payload.countryCode === 'string') {
      author.countryCode = payload.countryCode
    }

    if (payload.avatar) {
      author.avatar = payload.avatar
    }

    if (typeof payload.website === 'string') {
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
