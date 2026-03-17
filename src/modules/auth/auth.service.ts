import axios from 'axios'
import bcrypt from 'bcryptjs'
import { Request } from 'express'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import env from '../../config/env'
import { EmailVerifyToken } from '../../models/email-verify-token.model'
import { LoginHistory } from '../../models/login-history.model'
import { PasswordResetToken } from '../../models/password-reset-token.model'
import { IUser, User } from '../../models/user.model'
import * as emailService from '../../services/email.service'
import {
  generateCryptoToken,
  generateUserJWT,
  hashToken,
  hoursFromNow,
  parseDeviceType,
} from '../../utils/token'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafeUser = Omit<
  IUser,
  'password_hash' | 'token_version' | 'google_id' | 'facebook_id'
>

export interface AuthResult {
  token: string
  user: Record<string, unknown>
}

interface FacebookUser {
  id: string
  name: string
  email?: string
  picture?: { data?: { url?: string } }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID)

const toSafeUser = (user: IUser): Record<string, unknown> => {
  const obj = user.toObject() as Record<string, unknown>
  delete obj.password_hash
  delete obj.token_version
  delete obj.google_id
  delete obj.facebook_id
  return obj
}

const logLogin = async (params: {
  actorId: unknown
  actorType?: 'user' | 'staff'
  method: 'email' | 'google' | 'facebook'
  req: Request
  status: 'success' | 'failed'
  failReason?: string
}): Promise<void> => {
  try {
    const {
      actorId,
      actorType = 'user',
      method,
      req,
      status,
      failReason,
    } = params
    const userAgent = req.headers['user-agent'] ?? ''
    await LoginHistory.create({
      actor_id: actorId,
      actor_type: actorType,
      method,
      ip_address: req.ip ?? null,
      user_agent: userAgent,
      device_type: parseDeviceType(userAgent),
      status,
      fail_reason: failReason ?? null,
    })
  } catch {
    // Non-critical — never let logging failure break auth flow
  }
}

const issueEmailVerifyToken = async (userId: unknown): Promise<string> => {
  const plain = generateCryptoToken(32)
  await EmailVerifyToken.create({
    user_id: userId,
    token: plain,
    expires_at: hoursFromNow(env.EMAIL_VERIFY_EXPIRES_HOURS),
  })
  return plain
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export const register = async (
  body: { name: string; email: string; password: string; language?: string },
  req: Request,
): Promise<AuthResult> => {
  const { name, email, password, language = 'en' } = body

  const existing = await User.findOne({ email })
  if (existing) {
    const err = new Error('Email is already registered.') as Error & {
      statusCode: number
    }
    err.statusCode = 409
    throw err
  }

  const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)
  const user = await User.create({ name, email, password_hash, language })

  const verifyToken = await issueEmailVerifyToken(user._id)
  emailService
    .sendVerificationEmail({ to: email, name, token: verifyToken })
    .catch(() => {})

  void logLogin({ actorId: user._id, method: 'email', req, status: 'success' })

  return { token: generateUserJWT(user), user: toSafeUser(user) }
}

export const login = async (
  body: { email: string; password: string },
  req: Request,
): Promise<AuthResult> => {
  const { email, password } = body
  const user = await User.findOne({ email })

  if (!user?.password_hash) {
    if (user)
      void logLogin({
        actorId: user._id,
        method: 'email',
        req,
        status: 'failed',
        failReason: 'invalid_credentials',
      })
    const err = new Error('Invalid email or password.') as Error & {
      statusCode: number
    }
    err.statusCode = 401
    throw err
  }

  if (user.status === 'suspended') {
    void logLogin({
      actorId: user._id,
      method: 'email',
      req,
      status: 'failed',
      failReason: 'account_suspended',
    })
    const err = new Error('Your account has been suspended.') as Error & {
      statusCode: number
    }
    err.statusCode = 403
    throw err
  }

  if (user.status === 'deleted') {
    const err = new Error('Account not found.') as Error & {
      statusCode: number
    }
    err.statusCode = 404
    throw err
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    void logLogin({
      actorId: user._id,
      method: 'email',
      req,
      status: 'failed',
      failReason: 'invalid_credentials',
    })
    const err = new Error('Invalid email or password.') as Error & {
      statusCode: number
    }
    err.statusCode = 401
    throw err
  }

  await User.findByIdAndUpdate(user._id, { last_active_at: new Date() })
  void logLogin({ actorId: user._id, method: 'email', req, status: 'success' })

  return { token: generateUserJWT(user), user: toSafeUser(user) }
}

export const googleAuth = async (
  idToken: string,
  req: Request,
): Promise<AuthResult> => {
  let payload: TokenPayload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })
    payload = ticket.getPayload()!
  } catch {
    const err = new Error('Invalid Google token.') as Error & {
      statusCode: number
    }
    err.statusCode = 401
    throw err
  }

  const { sub: google_id, email, name = 'User', picture } = payload

  let user = await User.findOne({ google_id })
  if (!user && email) user = await User.findOne({ email })

  if (user) {
    if (user.status === 'suspended') {
      const e = new Error('Your account has been suspended.') as Error & {
        statusCode: number
      }
      e.statusCode = 403
      throw e
    }
    if (user.status === 'deleted') {
      const e = new Error('Account not found.') as Error & {
        statusCode: number
      }
      e.statusCode = 404
      throw e
    }

    const updates: Partial<IUser> = { last_active_at: new Date() }
    if (!user.google_id) updates.google_id = google_id
    if (!user.avatar_url && picture) updates.avatar_url = picture
    if (!user.email_verified) {
      updates.email_verified = true
      updates.email_verified_at = new Date()
    }
    await User.findByIdAndUpdate(user._id, updates)
    user = (await User.findById(user._id))!
  } else {
    user = await User.create({
      name,
      email,
      google_id,
      avatar_url: picture ?? null,
      email_verified: true,
      email_verified_at: new Date(),
    })
    if (email)
      emailService.sendWelcomeEmail({ to: email, name }).catch(() => {})
  }

  void logLogin({ actorId: user._id, method: 'google', req, status: 'success' })
  return { token: generateUserJWT(user), user: toSafeUser(user) }
}

export const facebookAuth = async (
  accessToken: string,
  req: Request,
): Promise<AuthResult> => {
  let fbUser: FacebookUser
  try {
    const { data } = await axios.get<FacebookUser>(
      'https://graph.facebook.com/me',
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,email,picture.type(large)',
        },
      },
    )
    fbUser = data
  } catch {
    const err = new Error('Invalid Facebook access token.') as Error & {
      statusCode: number
    }
    err.statusCode = 401
    throw err
  }

  const { id: facebook_id, name, email, picture } = fbUser
  const avatar_url = picture?.data?.url ?? null

  let user = await User.findOne({ facebook_id })
  if (!user && email) user = await User.findOne({ email })

  if (user) {
    if (user.status === 'suspended') {
      const e = new Error('Your account has been suspended.') as Error & {
        statusCode: number
      }
      e.statusCode = 403
      throw e
    }
    if (user.status === 'deleted') {
      const e = new Error('Account not found.') as Error & {
        statusCode: number
      }
      e.statusCode = 404
      throw e
    }

    const updates: Partial<IUser> = { last_active_at: new Date() }
    if (!user.facebook_id) updates.facebook_id = facebook_id
    if (!user.avatar_url && avatar_url) updates.avatar_url = avatar_url
    if (!user.email_verified && email) {
      updates.email_verified = true
      updates.email_verified_at = new Date()
    }
    await User.findByIdAndUpdate(user._id, updates)
    user = (await User.findById(user._id))!
  } else {
    user = await User.create({
      name,
      email: email ?? null,
      facebook_id,
      avatar_url,
      email_verified: !!email,
      email_verified_at: email ? new Date() : null,
    })
    if (email)
      emailService.sendWelcomeEmail({ to: email, name }).catch(() => {})
  }

  void logLogin({
    actorId: user._id,
    method: 'facebook',
    req,
    status: 'success',
  })
  return { token: generateUserJWT(user), user: toSafeUser(user) }
}

export const logout = async (userId: unknown): Promise<void> => {
  await User.findByIdAndUpdate(userId, { $inc: { token_version: 1 } })
}

export const verifyEmail = async (token: string): Promise<void> => {
  const record = await EmailVerifyToken.findOne({ token, used_at: null })
  if (!record) {
    const e = new Error('Invalid or expired verification token.') as Error & {
      statusCode: number
    }
    e.statusCode = 400
    throw e
  }
  if (record.expires_at < new Date()) {
    const e = new Error(
      'Verification token has expired. Please request a new one.',
    ) as Error & { statusCode: number }
    e.statusCode = 400
    throw e
  }

  await User.findByIdAndUpdate(record.user_id, {
    email_verified: true,
    email_verified_at: new Date(),
  })
  await EmailVerifyToken.findByIdAndUpdate(record._id, { used_at: new Date() })
}

export const resendVerification = async (user: IUser): Promise<void> => {
  if (user.email_verified) {
    const e = new Error('Email is already verified.') as Error & {
      statusCode: number
    }
    e.statusCode = 400
    throw e
  }
  await EmailVerifyToken.updateMany(
    { user_id: user._id, used_at: null },
    { used_at: new Date() },
  )
  const token = await issueEmailVerifyToken(user._id)
  emailService
    .sendVerificationEmail({ to: user.email, name: user.name, token })
    .catch(() => {})
}

export const forgotPassword = async (
  email: string,
  ip?: string,
): Promise<void> => {
  const user = await User.findOne({ email, status: 'active' })
  if (user?.email_verified) {
    const plainToken = generateCryptoToken(32)
    const token_hash = hashToken(plainToken)
    await PasswordResetToken.updateMany(
      { user_id: user._id, used_at: null },
      { used_at: new Date() },
    )
    await PasswordResetToken.create({
      user_id: user._id,
      token_hash,
      expires_at: hoursFromNow(env.PASSWORD_RESET_EXPIRES_HOURS),
      ip_address: ip ?? null,
    })
    emailService
      .sendPasswordResetEmail({ to: email, name: user.name, token: plainToken })
      .catch(() => {})
  }
  // Always silently succeed to prevent email enumeration
}

export const resetPassword = async (
  token: string,
  password: string,
): Promise<void> => {
  const token_hash = hashToken(token)
  const record = await PasswordResetToken.findOne({ token_hash, used_at: null })
  if (!record) {
    const e = new Error('Invalid or expired reset token.') as Error & {
      statusCode: number
    }
    e.statusCode = 400
    throw e
  }
  if (record.expires_at < new Date()) {
    const e = new Error('Reset token has expired.') as Error & {
      statusCode: number
    }
    e.statusCode = 400
    throw e
  }

  const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS)
  await User.findByIdAndUpdate(record.user_id, {
    password_hash,
    $inc: { token_version: 1 },
  })
  await PasswordResetToken.findByIdAndUpdate(record._id, {
    used_at: new Date(),
  })
}

export const getMe = async (userId: unknown): Promise<IUser | null> =>
  User.findById(userId)
    .populate(
      'current_plan_id',
      'name slug color features price_monthly price_yearly',
    )
    .select('-password_hash -token_version -google_id -facebook_id')

export const updateProfile = async (
  userId: unknown,
  updates: Partial<
    Pick<IUser, 'name' | 'avatar_url' | 'language' | 'birthday' | 'timezone'>
  >,
): Promise<IUser | null> =>
  User.findByIdAndUpdate(userId, updates, { new: true }).select(
    '-password_hash -token_version -google_id -facebook_id',
  )

export const changePassword = async (
  userId: unknown,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await User.findById(userId).select('+password_hash')
  if (!user?.password_hash) {
    const e = new Error(
      'Cannot change password for accounts registered via Google or Facebook.',
    ) as Error & { statusCode: number }
    e.statusCode = 400
    throw e
  }
  const isValid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!isValid) {
    const e = new Error('Current password is incorrect.') as Error & {
      statusCode: number
    }
    e.statusCode = 400
    throw e
  }

  const password_hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS)
  await User.findByIdAndUpdate(userId, {
    password_hash,
    $inc: { token_version: 1 },
  })
}

export const updateNotificationPrefs = async (
  userId: unknown,
  prefs: Partial<IUser['notification_prefs']>,
): Promise<IUser['notification_prefs'] | null> => {
  const updates: Record<string, boolean> = {}
  if (prefs.email !== undefined)
    updates['notification_prefs.email'] = prefs.email
  if (prefs.sms !== undefined) updates['notification_prefs.sms'] = prefs.sms
  if (prefs.in_app !== undefined)
    updates['notification_prefs.in_app'] = prefs.in_app
  if (prefs.push !== undefined) updates['notification_prefs.push'] = prefs.push

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
  }).select('notification_prefs')
  return user?.notification_prefs ?? null
}

export const getLoginHistory = async (
  userId: unknown,
  page: number,
  limit: number,
): Promise<{ records: ILoginHistory[]; total: number }> => {
  const skip = (page - 1) * limit
  const filter = { actor_id: userId, actor_type: 'user' as const }
  const [records, total] = await Promise.all([
    LoginHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    LoginHistory.countDocuments(filter),
  ])
  return { records, total }
}

// Type import for LoginHistory records
import type { ILoginHistory } from '../../models/login-history.model'
