export interface IDashboardStats {
  readingStats: {
    totalBooksRead: number
    booksCurrentlyReading: number
    totalReadingTime: number
    averageRatingGiven: number
  }
  accessStats: {
    totalBooksAccessed: number
    currentlyReading: number
  }
  subscriptionStats: {
    currentPlan: string | null
    daysRemaining: number
    isActive: boolean
    renewalDate: string | null
  }
  libraryStats: {
    wishlistCount: number
    totalReviews: number
  }
}

export interface IDashboardRecommendation {
  id: string
  title: string
  description?: string
  authorIds: string[]
  categoryIds: string[]
  reason: string
  coverImage?: {
    publicId: string
    url: string
  }
  ratingAverage: number
  ratingCount: number
}
