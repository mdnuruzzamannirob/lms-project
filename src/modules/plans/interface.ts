import type { Types } from 'mongoose'

export type PlanBillingCycle = 'monthly' | 'yearly'

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
  recommended: boolean
  stripeProductId?: string
  stripePriceId?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type PlanAccessLevel = 'free' | 'basic' | 'premium'

export interface CreatePlanPayload {
  code: string
  name: string
  description: string
  price: number
  currency: string
  durationDays: number
  maxDevices: number
  downloadEnabled: boolean
  accessLevel: PlanAccessLevel
  features: string[]
  isFree: boolean
  recommended: boolean
  stripeProductId?: string
  stripePriceId?: string
  isActive: boolean
  sortOrder: number
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>
