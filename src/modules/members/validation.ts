import { z } from 'zod'

import { paginationSchema } from '../../common/validators/common'
import { objectIdSchema } from '../../common/validators/objectId'

export const membersValidation = {
  listQuery: paginationSchema.extend({
    search: z.string().max(200).optional(),
    isSuspended: z.enum(['true', 'false']).optional(),
  }),
  userIdParam: z.object({
    userId: objectIdSchema,
  }),
  suspendBody: z.object({
    reason: z.string().min(1).max(500),
  }),
  readingHistoryQuery: z.object({
    status: z.enum(['current', 'completed', 'all']).default('all'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  paymentHistoryQuery: paginationSchema,
}

