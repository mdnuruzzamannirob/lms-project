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
  forgotPasswordBody: z.object({
    email: z.string().trim().email(),
  }),
  resendResetOtpBody: z.object({
    email: z.string().trim().email(),
  }),
  verifyResetOtpBody: z.object({
    email: z.string().trim().email(),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  resetPasswordBody: z.object({
    resetToken: z.string().trim().min(10),
    newPassword: z.string().min(8).max(72),
  }),
  changePasswordBody: z.object({
    currentPassword: z.string().min(8).max(72),
    newPassword: z.string().min(8).max(72),
  }),
  staffTwoFactorSetupBody: z.object({}),
  staffTwoFactorEnableBody: z.object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
  staffTwoFactorVerifyBody: z
    .object({
      otp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, '2FA code must be 6 digits')
        .optional(),
      emailOtp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, '2FA code must be 6 digits')
        .optional(),
    })
    .refine((value) => Boolean(value.otp || value.emailOtp), {
      message: 'Either otp or emailOtp is required',
    }),
  disableTwoFactorBody: z.object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, '2FA code must be 6 digits'),
  }),
}
