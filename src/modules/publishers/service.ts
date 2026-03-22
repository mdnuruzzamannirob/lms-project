import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import type { IPublisher } from './interface'
import { PublisherModel } from './model'

const formatPublisher = (publisher: IPublisher | null) => {
  if (!publisher) throw new AppError('Publisher not found.', 404)
  return {
    id: publisher._id.toString(),
    name: publisher.name,
    slug: publisher.slug,
    description: publisher.description,
    website: publisher.website,
    logo: publisher.logo ?? null,
    country: publisher.country,
    foundedYear: publisher.foundedYear,
    isActive: publisher.isActive,
    createdAt: publisher.createdAt.toISOString(),
    updatedAt: publisher.updatedAt.toISOString(),
  }
}

export const publishersService = {
  listPublishers: async (query: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) => {
    const pagination = getPaginationState(query)
    const filter: Record<string, unknown> = {}
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive
    if (query.search)
      filter.$or = [{ name: { $regex: query.search, $options: 'i' } }]

    const [publishers, total] = await Promise.all([
      PublisherModel.find(filter)
        .sort({ name: 1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      PublisherModel.countDocuments(filter),
    ])

    return {
      meta: createPaginationMeta(pagination, total),
      data: publishers.map(formatPublisher),
    }
  },

  getPublisherById: async (id: string) => {
    const publisher = await PublisherModel.findById(id)
    return formatPublisher(publisher)
  },

  createPublisher: async (payload: {
    name: string
    slug: string
    description?: string
    website?: string
    logo?: { publicId: string; url: string }
    country?: string
    foundedYear?: number
    isActive: boolean
  }) => {
    const [existingName, existingSlug] = await Promise.all([
      PublisherModel.findOne({ name: payload.name }),
      PublisherModel.findOne({ slug: payload.slug }),
    ])
    if (existingName)
      throw new AppError('Publisher with this name already exists.', 409)
    if (existingSlug) throw new AppError('Publisher slug already exists.', 409)

    const publisher = await PublisherModel.create(payload)
    return formatPublisher(publisher)
  },

  updatePublisher: async (
    id: string,
    payload: Partial<{
      name: string
      slug: string
      description: string
      website: string
      logo: { publicId: string; url: string }
      country: string
      foundedYear: number
      isActive: boolean
    }>,
  ) => {
    const publisher = await PublisherModel.findById(id)
    if (!publisher) throw new AppError('Publisher not found.', 404)

    if (typeof payload.name === 'string') publisher.name = payload.name
    if (typeof payload.slug === 'string') {
      const existing = await PublisherModel.findOne({
        slug: payload.slug,
        _id: { $ne: publisher._id },
      })
      if (existing) throw new AppError('Publisher slug already exists.', 409)
      publisher.slug = payload.slug
    }
    if (typeof payload.description === 'string')
      publisher.description = payload.description
    if (typeof payload.website === 'string') publisher.website = payload.website
    if (payload.logo) publisher.logo = payload.logo
    if (typeof payload.country === 'string') publisher.country = payload.country
    if (typeof payload.foundedYear === 'number')
      publisher.foundedYear = payload.foundedYear
    if (typeof payload.isActive === 'boolean')
      publisher.isActive = payload.isActive

    await publisher.save()
    return formatPublisher(publisher)
  },

  deletePublisher: async (id: string) => {
    const publisher = await PublisherModel.findById(id)
    if (!publisher) throw new AppError('Publisher not found.', 404)
    await publisher.deleteOne()
  },
}
