import { Document, Schema, Types, model } from 'mongoose'

export interface IUser extends Document {
  _id: Types.ObjectId
  name: string
  email: string
  phone?: string
  password_hash?: string
  avatar_url?: string
  birthday?: Date
  timezone: string
  language: 'en' | 'bn'
  status: 'active' | 'suspended' | 'deleted'

  email_verified: boolean
  email_verified_at?: Date

  google_id?: string
  facebook_id?: string

  // Denormalized for fast auth checks
  current_plan_id?: Types.ObjectId
  plan_expires_at?: Date
  subscription_status: 'free' | 'trial' | 'active' | 'expired'

  // Reading stats
  total_books_read: number
  total_reading_mins: number
  reading_streak_days: number
  last_active_at: Date

  notification_prefs: {
    email: boolean
    sms: boolean
    in_app: boolean
    push: boolean
  }

  referral_code?: string
  referred_by?: Types.ObjectId
  onboarding_completed: boolean

  // JWT invalidation on logout / password change
  token_version: number

  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, default: undefined },
    password_hash: { type: String, default: undefined },
    avatar_url: { type: String, default: undefined },
    birthday: { type: Date, default: undefined },
    timezone: { type: String, default: 'Asia/Dhaka' },
    language: { type: String, enum: ['en', 'bn'], default: 'en' },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },

    email_verified: { type: Boolean, default: false },
    email_verified_at: { type: Date, default: undefined },

    google_id: { type: String, default: undefined },
    facebook_id: { type: String, default: undefined },

    current_plan_id: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      default: undefined,
    },
    plan_expires_at: { type: Date, default: undefined },
    subscription_status: {
      type: String,
      enum: ['free', 'trial', 'active', 'expired'],
      default: 'free',
    },

    total_books_read: { type: Number, default: 0 },
    total_reading_mins: { type: Number, default: 0 },
    reading_streak_days: { type: Number, default: 0 },
    last_active_at: { type: Date, default: Date.now },

    notification_prefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      in_app: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },

    referral_code: { type: String, default: undefined },
    referred_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    onboarding_completed: { type: Boolean, default: false },

    token_version: { type: Number, default: 0 },
  },
  { timestamps: true },
)

userSchema.index({ google_id: 1 }, { unique: true, sparse: true })
userSchema.index({ facebook_id: 1 }, { unique: true, sparse: true })
userSchema.index({ referral_code: 1 }, { unique: true, sparse: true })
userSchema.index({ phone: 1 }, { unique: true, sparse: true })
userSchema.index({ status: 1 })
userSchema.index({ subscription_status: 1 })
userSchema.index({ current_plan_id: 1 })
userSchema.index({ plan_expires_at: 1 })

export const User = model<IUser>('User', userSchema)
