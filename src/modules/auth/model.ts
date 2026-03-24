import { model, Schema, type Model } from 'mongoose'

import type {
  IUser,
  UserAuthProvider,
  UserEmailVerificationToken,
  UserLoginHistory,
  UserNotificationPreferences,
  UserTwoFactor,
} from './interface'

type UserDocument = IUser

const notificationPreferencesSchema = new Schema<UserNotificationPreferences>(
  {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  { _id: false },
)

const userTwoFactorSchema = new Schema<UserTwoFactor>(
  {
    enabled: { type: Boolean, default: false },
    secret: { type: String, required: false, default: undefined },
    backupCodes: {
      type: [String],
      required: false,
      default: undefined,
    },
    verifiedAt: { type: Date, required: false, default: undefined },
  },
  { _id: false },
)

const userSchema = new Schema<UserDocument>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: false, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    countryCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 3,
      default: undefined,
      index: true,
    },
    phone: { type: String, required: false, trim: true, default: undefined },
    profilePicture: { type: String, required: false, default: undefined },
    passwordHash: { type: String, required: false },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'] satisfies UserAuthProvider[],
      default: 'local',
      required: true,
    },
    socialProviderId: { type: String, required: false, index: true },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    isSuspended: { type: Boolean, default: false, index: true },
    suspendedAt: { type: Date, required: false, default: undefined },
    suspensionReason: { type: String, required: false, default: undefined },
    deletedAt: { type: Date, required: false, default: undefined },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({ email: true, push: true }),
    },
    twoFactor: {
      type: userTwoFactorSchema,
      default: () => ({
        enabled: false,
        secret: undefined,
        backupCodes: undefined,
        verifiedAt: undefined,
      }),
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
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

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

export const UserLoginHistoryModel = model<UserLoginHistory>(
  'UserLoginHistory',
  loginHistorySchema,
)
