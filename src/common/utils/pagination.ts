export type PaginationInput = {
  page?: unknown
  limit?: unknown
}

export type PaginationState = {
  page: number
  limit: number
  skip: number
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  pages: number
}

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export const getPaginationState = (
  query: PaginationInput,
  options?: { defaultPage?: number; defaultLimit?: number; maxLimit?: number },
): PaginationState => {
  const defaultPage = options?.defaultPage ?? 1
  const defaultLimit = options?.defaultLimit ?? 20
  const maxLimit = options?.maxLimit ?? 100

  const page = toPositiveInt(query.page, defaultPage)
  const requestedLimit = toPositiveInt(query.limit, defaultLimit)
  const limit = Math.min(requestedLimit, maxLimit)

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export const createPaginationMeta = (
  pagination: Pick<PaginationState, 'page' | 'limit'>,
  total: number,
): PaginationMeta => {
  const pages = Math.max(Math.ceil(total / pagination.limit), 1)

  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    pages,
  }
}
