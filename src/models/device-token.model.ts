import { Document, Schema, Types, model } from 'mongoose'

export interface IDeviceToken extends Document {
  user_id: Types.ObjectId
  token: string
  platform: 'web' | 'android' | 'ios'
  device_name?: string
  is_active: boolean
  last_used_at: Date
}

const schema = new Schema<IDeviceToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], required: true },
    device_name: { type: String, default: undefined },
    is_active: { type: Boolean, default: true },
    last_used_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

schema.index({ user_id: 1, is_active: 1 })

export const DeviceToken = model<IDeviceToken>('DeviceToken', schema)
