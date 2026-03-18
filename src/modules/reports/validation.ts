import { z } from 'zod'

import { paginationSchema } from '../../common/validators/common'
import { objectIdSchema } from '../../common/validators/objectId'

export const reportsValidation = {
  createBody: z.object({
    type: z.enum([
      'admin_overview',
      'revenue_summary',
      'popular_books',
      'borrow_stats',
    ]),
    format: z.enum(['json', 'csv', 'pdf', 'excel']).default('csv'),
    filters: z.record(z.unknown()).optional(),
  }),
  listQuery: paginationSchema.extend({
    status: z
      .enum(['queued', 'processing', 'completed', 'failed', 'expired'])
      .optional(),
    type: z
      .enum([
        'admin_overview',
        'revenue_summary',
        'popular_books',
        'borrow_stats',
      ])
      .optional(),
  }),
  reportIdParam: z.object({
    reportId: objectIdSchema,
  }),
}
