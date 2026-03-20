import { model, Schema, type Model } from 'mongoose'

export type EmailOtpActorType = 'user' | 'staff'
export type EmailOtpPurpose =
  | 'login'
  | '2fa-verify'
  | '2fa-setup'
  | 'password-reset'

type EmailOtpDocument = {
  actorId: Schema.Types.ObjectId
  actorType: EmailOtpActorType
  otpHash: string
  purpose: EmailOtpPurpose
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const emailOtpSchema = new Schema<EmailOtpDocument>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      required: true,
      enum: ['user', 'staff'] satisfies EmailOtpActorType[],
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        'login',
        '2fa-verify',
        '2fa-setup',
        'password-reset',
      ] satisfies EmailOtpPurpose[],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      required: false,
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

emailOtpSchema.index({ actorId: 1, actorType: 1, purpose: 1, usedAt: 1 })
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const EmailOtpModel: Model<EmailOtpDocument> = model<EmailOtpDocument>(
  'EmailOtp',
  emailOtpSchema,
)
