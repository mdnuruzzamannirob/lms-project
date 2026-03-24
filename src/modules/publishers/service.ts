import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import {
  sanitizeOptionalText,
  sanitizeRequiredText,
} from '../../common/utils/sanitize'
import {
  type CreatePublisherPayload,
  type PublishersListQuery,
  type UpdatePublisherPayload,
} from './interface'
import { PublisherModel } from './model'
import { formatPublisher } from './utils'

const listPublishers = async (query: PublishersListQuery) => {
  const pagination = getPaginationState(query)
  const filter: Record<string, unknown> = {}
  if (typeof query.isActive === 'boolean') filter.isActive = query.isActive
  if (query.search) filter.$text = { $search: query.search }

  const projection = query.search ? { score: { $meta: 'textScore' } } : {}

  const [publishers, total] = await Promise.all([
    PublisherModel.find(filter, projection)
      .sort(
        query.search
          ? ({ score: { $meta: 'textScore' }, name: 1 } as const)
          : ({ name: 1 } as const),
      )
      .skip(pagination.skip)
      .limit(pagination.limit),
    PublisherModel.countDocuments(filter),
  ])

  return {
    meta: createPaginationMeta(pagination, total),
    data: publishers.map(formatPublisher),
  }
}

const getPublisherById = async (id: string) => {
  const publisher = await PublisherModel.findById(id)
  return formatPublisher(publisher)
}

const createPublisher = async (payload: CreatePublisherPayload) => {
  const [existingName, existingSlug] = await Promise.all([
    PublisherModel.findOne({ name: payload.name }),
    PublisherModel.findOne({ slug: payload.slug }),
  ])
  if (existingName)
    throw new AppError('Publisher with this name already exists.', 409)
  if (existingSlug) throw new AppError('Publisher slug already exists.', 409)

  const publisher = await PublisherModel.create({
    name: sanitizeRequiredText(payload.name, 'Name', 2),
    slug: payload.slug,
    description: sanitizeOptionalText(payload.description) ?? null,
    website: payload.website ?? null,
    logo: payload.logo ?? null,
    countryCode: payload.countryCode ?? null,
    foundedYear: payload.foundedYear ?? null,
    isActive: payload.isActive,
  })
  return formatPublisher(publisher)
}

const updatePublisher = async (id: string, payload: UpdatePublisherPayload) => {
  const publisher = await PublisherModel.findById(id)
  if (!publisher) throw new AppError('Publisher not found.', 404)

  if (typeof payload.name === 'string') {
    const existing = await PublisherModel.findOne({
      name: payload.name,
      _id: { $ne: publisher._id },
    })

    if (existing) {
      throw new AppError('Publisher with this name already exists.', 409)
    }

    publisher.name = sanitizeRequiredText(payload.name, 'Name', 2)
  }
  if (typeof payload.slug === 'string') {
    const existing = await PublisherModel.findOne({
      slug: payload.slug,
      _id: { $ne: publisher._id },
    })
    if (existing) throw new AppError('Publisher slug already exists.', 409)
    publisher.slug = payload.slug
  }
  if (typeof payload.description !== 'undefined') {
    publisher.description = sanitizeOptionalText(payload.description) ?? null
  }
  if (typeof payload.website === 'string' || payload.website === null) {
    publisher.website = payload.website
  }
  if (typeof payload.logo !== 'undefined') {
    publisher.logo = payload.logo
  }
  if (typeof payload.countryCode === 'string' || payload.countryCode === null) {
    publisher.countryCode = payload.countryCode
  }
  if (typeof payload.foundedYear === 'number' || payload.foundedYear === null)
    publisher.foundedYear = payload.foundedYear
  if (typeof payload.isActive === 'boolean')
    publisher.isActive = payload.isActive

  await publisher.save()
  return formatPublisher(publisher)
}

const deletePublisher = async (id: string) => {
  const publisher = await PublisherModel.findById(id)
  if (!publisher) throw new AppError('Publisher not found.', 404)
  await publisher.deleteOne()
}

export const publishersService = {
  listPublishers,
  getPublisherById,
  createPublisher,
  updatePublisher,
  deletePublisher,
}
