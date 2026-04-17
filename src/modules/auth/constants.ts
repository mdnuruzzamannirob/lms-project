export const authConstants = {
  userRole: 'user',
  verificationTokenTtlMinutes: 30,
  resetTokenTtlMinutes: 20,
  twoFactorChallengeTokenTtlMinutes: 10,
  loginMaxAttempts: 5,
  lockoutMinutes: 15,
  loginHistoryDefaultLimit: 10,
  loginHistoryMaxLimit: 10,
} as const

export const USER_REFRESH_COOKIE_NAME = 'stackread_refresh'
