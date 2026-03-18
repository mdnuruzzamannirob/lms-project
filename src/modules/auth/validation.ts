import { z } from 'zod'

export const authValidation = {
  registerBody: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
    countryCode: z.string().trim().length(2).toUpperCase(),
  }),
  loginBody: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
  }),
  verifyEmailBody: z.object({
    token: z.string().trim().min(10),
  }),
  resendVerificationBody: z.object({
    email: z.string().trim().email(),
  }),
  forgotPasswordBody: z.object({
    email: z.string().trim().email(),
  }),
  resetPasswordBody: z.object({
    token: z.string().trim().min(10),
    newPassword: z.string().min(8).max(72),
  }),
  updateMeBody: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      countryCode: z.string().trim().min(2).max(3).toUpperCase().optional(),
      notificationPreferences: z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
        })
        .optional(),
    })
    .refine(
      (value) =>
        typeof value.name !== 'undefined' ||
        typeof value.countryCode !== 'undefined' ||
        typeof value.notificationPreferences !== 'undefined',
      {
        message: 'At least one profile field is required',
      },
    ),
  changePasswordBody: z.object({
    currentPassword: z.string().min(8).max(72),
    newPassword: z.string().min(8).max(72),
  }),
  updateNotificationPreferencesBody: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .refine(
      (value) =>
        typeof value.email !== 'undefined' || typeof value.push !== 'undefined',
      {
        message: 'At least one notification preference is required',
      },
    ),
}
