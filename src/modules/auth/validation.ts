import { z } from 'zod'

import { authConstants } from './constants'

export const authValidation = {
  registerBody: z.object({
    firstName: z.string().trim().min(2).max(100),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email(),
    phone: z.string().trim().min(6).max(32),
    address: z.string().trim().min(2).max(240),
    password: z.string().min(8).max(72),
    countryCode: z.string().trim().length(2).toUpperCase(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  }),
  loginBody: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
    rememberMe: z.boolean().optional(),
  }),
  twoFactorChallengeBody: z
    .object({
      tempToken: z.string().trim().min(20),
      otp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'OTP must be 6 digits')
        .optional(),
      emailOtp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'OTP must be 6 digits')
        .optional(),
      backupCode: z
        .string()
        .trim()
        .regex(/^\d{8,10}$/, 'Backup code must be 8-10 digits')
        .optional(),
    })
    .refine(
      (value) => Boolean(value.otp || value.emailOtp || value.backupCode),
      {
        message: 'One of otp, emailOtp, or backupCode is required',
      },
    ),
  twoFactorVerifyBody: z
    .object({
      currentPassword: z.string().min(8).max(72),
      otp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'OTP must be 6 digits')
        .optional(),
      emailOtp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'OTP must be 6 digits')
        .optional(),
    })
    .refine((value) => Boolean(value.otp || value.emailOtp), {
      message: 'One of otp or emailOtp is required',
    }),
  twoFactorDisableBody: z.object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be 6 digits')
      .optional(),
    currentPassword: z.string().min(8).max(72),
  }),
  twoFactorBackupCodesQuery: z.object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be 6 digits'),
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
  sendEmailOtpBody: z.object({
    tempToken: z.string().trim().min(20),
  }),
  enableTwoFactorBody: z.object({
    currentPassword: z.string().min(8).max(72),
  }),
  updateMyProfilePictureBody: z
    .object({
      profilePicture: z
        .union([z.string().trim().url(), z.literal('')])
        .optional(),
      fileBase64: z.string().trim().min(16).optional(),
      fileName: z.string().trim().min(1).max(160).optional(),
    })
    .refine(
      (value) =>
        typeof value.profilePicture !== 'undefined' ||
        typeof value.fileBase64 === 'string',
      {
        message: 'Either profilePicture or fileBase64 is required',
      },
    ),
  regenerateBackupCodesBody: z.object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'OTP must be 6 digits')
      .optional(),
    currentPassword: z.string().min(8).max(72),
  }),
  loginHistoryQuery: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(authConstants.loginHistoryMaxLimit)
      .default(authConstants.loginHistoryDefaultLimit),
  }),
  updateMeBody: z
    .object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().min(6).max(32).optional(),
      address: z.string().trim().min(2).max(240).optional(),
      profilePicture: z.string().trim().url().optional(),
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
        typeof value.firstName !== 'undefined' ||
        typeof value.lastName !== 'undefined' ||
        typeof value.email !== 'undefined' ||
        typeof value.phone !== 'undefined' ||
        typeof value.address !== 'undefined' ||
        typeof value.profilePicture !== 'undefined' ||
        typeof value.countryCode !== 'undefined' ||
        typeof value.notificationPreferences !== 'undefined',
      {
        message: 'At least one profile field is required',
      },
    ),
  deleteMyAccountBody: z.object({
    confirmText: z.literal('DELETE'),
    currentPassword: z.string().min(8).max(72).optional(),
  }),
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
