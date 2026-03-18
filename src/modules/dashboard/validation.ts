import { z } from 'zod'

export const dashboardValidation = {
  homeQuery: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  statsQuery: z.object({}),
  recommendationsQuery: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  libraryQuery: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
}
