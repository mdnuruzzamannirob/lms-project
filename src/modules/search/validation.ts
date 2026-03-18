import { z } from 'zod'

import { objectIdSchema } from '../../common/validators/objectId'

export const searchValidation = {
  searchQuery: z.object({
    q: z.string().min(1).max(200),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
  suggestionsQuery: z.object({
    q: z.string().min(1).max(50),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
  popularTermsQuery: z.object({
    period: z.enum(['day', 'week', 'month', 'all']).default('week'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  logClickBody: z.object({
    query: z.string().min(1).max(200),
    bookId: objectIdSchema.optional(),
  }),
}
