import type { Types } from 'mongoose'
import type { PlanBillingCycle } from '../plans/interface'

export type OnboardingStatus = 'pending' | 'selected' | 'completed'

export interface IOnboarding {
  _id: Types.ObjectId
  userId: Types.ObjectId
  startedAt?: Date
  selectedPlanCode?: string
  selectedPlanName?: string
  selectedPlanPrice?: number
  selectedBillingCycle?: PlanBillingCycle
  selectedAt?: Date
  interests?: string[]
  selectedLanguage?: string
  status: OnboardingStatus
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
