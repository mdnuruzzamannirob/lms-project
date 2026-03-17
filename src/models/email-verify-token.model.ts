import { Document, Schema, Types, model } from 'mongoose'

export interface IEmailVerifyToken extends Document {
  user_id: Types.ObjectId
  token: string
  expires_at: Date
  used_at?: Date
  createdAt: Date
}

const schema = new Schema<IEmailVerifyToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: undefined },
  },
  { timestamps: true },
)

schema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
schema.index({ user_id: 1 })

export const EmailVerifyToken = model<IEmailVerifyToken>(
  'EmailVerifyToken',
  schema,
)
