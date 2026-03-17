import type { FilterQuery, Model } from 'mongoose'

export type QueryBuilderOptions<TDocument> = {
  model: Model<TDocument>
  baseFilter?: FilterQuery<TDocument>
  searchFields?: string[]
  searchableQuery?: string
  additionalFilters?: Record<string, unknown>
  sort?: string
  select?: string
  page?: number
  limit?: number
}

export type QueryBuilderResult<TDocument> = {
  data: TDocument[]
  total: number
}

export const queryBuilder = async <TDocument>(
  options: QueryBuilderOptions<TDocument>,
): Promise<QueryBuilderResult<TDocument>> => {
  const filter: FilterQuery<TDocument> = {
    ...(options.baseFilter ?? {}),
  }

  if (options.searchableQuery && options.searchFields?.length) {
    filter.$or = options.searchFields.map((field) => ({
      [field]: { $regex: options.searchableQuery, $options: 'i' },
    })) as FilterQuery<TDocument>['$or']
  }

  if (options.additionalFilters) {
    Object.entries(options.additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        ;(filter as Record<string, unknown>)[key] = value
      }
    })
  }

  const page = options.page && options.page > 0 ? options.page : 1
  const limit = options.limit && options.limit > 0 ? options.limit : 20
  const skip = (page - 1) * limit

  const query = options.model
    .find(filter)
    .sort(options.sort ?? '-createdAt')
    .skip(skip)
    .limit(limit)

  if (options.select) {
    query.select(options.select)
  }

  const [data, total] = await Promise.all([
    query.exec() as Promise<TDocument[]>,
    options.model.countDocuments(filter),
  ])

  return { data, total }
}
