import { z } from 'zod'

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }

  return value
}, z.boolean())

export const healthValidation = {
  query: z.object({
    details: booleanFromQuery.optional().default(false),
  }),
}
