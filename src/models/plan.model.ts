import { Document, Schema, Types, model } from 'mongoose'

export interface IPlan extends Document {
  _id: Types.ObjectId
  name: string
  slug: 'free' | 'basic' | 'standard' | 'premium'
  description: string
  color: string
  sort_order: number

  price_monthly: number
  price_yearly: number
  currency: string

  // -1 = unlimited, 0 = disabled/preview only
  borrow_limit: number
  borrow_duration_days: number
  book_access_limit: number
  monthly_read_limit: number

  offline_access: boolean
  is_free: boolean
  is_active: boolean
  features: string[]
}

const schema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'basic', 'standard', 'premium'],
    },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    sort_order: { type: Number, default: 0 },

    price_monthly: { type: Number, required: true, default: 0 },
    price_yearly: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'BDT' },

    borrow_limit: { type: Number, default: 0 },
    borrow_duration_days: { type: Number, default: 14 },
    book_access_limit: { type: Number, default: 0 },
    monthly_read_limit: { type: Number, default: -1 },

    offline_access: { type: Boolean, default: false },
    is_free: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    features: [{ type: String }],
  },
  { timestamps: true },
)

export const Plan = model<IPlan>('Plan', schema)
