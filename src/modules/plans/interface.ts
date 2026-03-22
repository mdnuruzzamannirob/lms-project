import type { Types } from 'mongoose'

export interface IPlan {
  _id: Types.ObjectId
  code: string
  name: string
  description: string
  price: number
  currency: string
  durationDays: number
  maxDevices: number
  downloadEnabled: boolean
  accessLevel: 'free' | 'basic' | 'premium'
  features: string[]
  isFree: boolean
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
