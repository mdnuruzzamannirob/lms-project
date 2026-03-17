import { z } from 'zod'

export const staffAuthValidation = {
  loginBody: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
  }),
  acceptInviteBody: z.object({
    token: z.string().trim().min(12),
    password: z.string().min(8).max(72),
  }),
  changePasswordBody: z.object({
    currentPassword: z.string().min(8).max(72),
    newPassword: z.string().min(8).max(72),
  }),
  verifyTwoFactorBody: z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, '2FA code must be 6 digits'),
  }),
  disableTwoFactorBody: z.object({
    password: z.string().min(8).max(72),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, '2FA code must be 6 digits'),
  }),
}
