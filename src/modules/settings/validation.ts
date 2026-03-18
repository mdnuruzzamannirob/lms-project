import { z } from 'zod'

const providerConfigSchema = z.object({
  email: z
    .object({
      from: z.string().trim().email().optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
  push: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  storage: z
    .object({
      enabled: z.boolean().optional(),
      basePath: z.string().trim().min(1).optional(),
    })
    .optional(),
  payment: z
    .object({
      enabled: z.boolean().optional(),
      currency: z.string().trim().min(3).max(3).optional(),
    })
    .optional(),
})

export const settingsValidation = {
  updateBody: z.object({
    providers: providerConfigSchema.optional(),
    templates: z
      .object({
        email: z.record(z.string()).optional(),
        push: z.record(z.string()).optional(),
      })
      .optional(),
    maintenance: z
      .object({
        enabled: z.boolean().optional(),
        message: z.string().trim().min(2).max(500).optional(),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().optional(),
        allowedIps: z.array(z.string().trim().min(3)).optional(),
      })
      .optional(),
    trial: z
      .object({
        enabled: z.boolean().optional(),
        durationDays: z.coerce.number().int().positive().optional(),
        maxBorrows: z.coerce.number().int().positive().optional(),
        autoActivate: z.boolean().optional(),
      })
      .optional(),
  }),
}
