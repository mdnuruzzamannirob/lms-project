import type { Types } from 'mongoose'

export interface IMember {
  _id: Types.ObjectId
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  profilePicture?: string
  isSuspended: boolean
  suspendedAt?: Date
  suspensionReason?: string
  joinDate: Date
  lastLoginAt?: Date
  totalBooksRead: number
  totalAmountSpent: number
  totalOrders: number
  createdAt: Date
  updatedAt: Date
}

export interface IMemberDetail extends IMember {
  readingHistory: Array<{
    bookId: string
    title: string
    status: string
    startedAt: Date
    completedAt?: Date
  }>
  paymentHistory: Array<{
    id: string
    amount: number
    status: string
    transactionId: string
    createdAt: Date
  }>
  activeSubscription?: {
    planId: string
    startDate: Date
    expiresAt: Date
    isActive: boolean
  }
}
