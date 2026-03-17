import { Document, Schema, Types, model } from 'mongoose'

export interface ILoginHistory extends Document {
  actor_id: Types.ObjectId
  actor_type: 'user' | 'staff'
  method: 'email' | 'google' | 'facebook'
  ip_address?: string
  user_agent?: string
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  country?: string
  status: 'success' | 'failed'
  fail_reason?: string
  createdAt: Date
}

const schema = new Schema<ILoginHistory>(
  {
    actor_id: { type: Schema.Types.ObjectId, required: true },
    actor_type: { type: String, enum: ['user', 'staff'], required: true },
    method: {
      type: String,
      enum: ['email', 'google', 'facebook'],
      required: true,
    },
    ip_address: { type: String, default: undefined },
    user_agent: { type: String, default: undefined },
    device_type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    country: { type: String, default: undefined },
    status: { type: String, enum: ['success', 'failed'], required: true },
    fail_reason: { type: String, default: undefined },
  },
  { timestamps: true },
)

// TTL: auto-delete after 90 days
schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
schema.index({ actor_id: 1, createdAt: -1 })

export const LoginHistory = model<ILoginHistory>('LoginHistory', schema)
