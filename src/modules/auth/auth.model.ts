import { model, Schema, type Model } from 'mongoose'

import type {
  IUser,
  UserAuthProvider,
  UserNotificationPreferences,
} from './auth.interface'

type UserDocument = IUser

type UserEmailVerificationToken = {
  userId: Schema.Types.ObjectId
  tokenHash: string
  expiresAt: Date
}

type UserPasswordResetToken = {
  userId: Schema.Types.ObjectId
  tokenHash: string
  expiresAt: Date
}

type UserLoginHistory = {
  userId: Schema.Types.ObjectId
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

const notificationPreferencesSchema = new Schema<UserNotificationPreferences>(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },
  { _id: false },
)

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: false },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'] satisfies UserAuthProvider[],
      default: 'local',
      required: true,
    },
    socialProviderId: { type: String, required: false, index: true },
    isEmailVerified: { type: Boolean, default: false },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({ email: true, sms: false, push: true }),
    },
    lastLoginAt: { type: Date, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

const emailVerificationTokenSchema = new Schema<UserEmailVerificationToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const passwordResetTokenSchema = new Schema<UserPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const loginHistorySchema = new Schema<UserLoginHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

loginHistorySchema.index({ userId: 1, createdAt: -1 })

export const UserModel: Model<UserDocument> = model<UserDocument>(
  'User',
  userSchema,
)

export const UserEmailVerificationTokenModel =
  model<UserEmailVerificationToken>(
    'UserEmailVerificationToken',
    emailVerificationTokenSchema,
  )

export const UserPasswordResetTokenModel = model<UserPasswordResetToken>(
  'UserPasswordResetToken',
  passwordResetTokenSchema,
)

export const UserLoginHistoryModel = model<UserLoginHistory>(
  'UserLoginHistory',
  loginHistorySchema,
)
