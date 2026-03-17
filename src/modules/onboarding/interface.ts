import type { Types } from 'mongoose'

export type OnboardingStatus = 'pending' | 'selected' | 'completed'

export interface IOnboarding {
  _id: Types.ObjectId
  userId: Types.ObjectId
  selectedPlanCode?: string
  selectedPlanName?: string
  selectedPlanPrice?: number
  selectedAt?: Date
  status: OnboardingStatus
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
