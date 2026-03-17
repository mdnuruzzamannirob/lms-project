import { Document, Schema, Types, model } from 'mongoose'

export interface IPasswordResetToken extends Document {
  user_id: Types.ObjectId
  token_hash: string
  expires_at: Date
  used_at?: Date
  ip_address?: string
  createdAt: Date
}

const schema = new Schema<IPasswordResetToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: undefined },
    ip_address: { type: String, default: undefined },
  },
  { timestamps: true },
)

schema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
schema.index({ user_id: 1 })

export const PasswordResetToken = model<IPasswordResetToken>(
  'PasswordResetToken',
  schema,
)
