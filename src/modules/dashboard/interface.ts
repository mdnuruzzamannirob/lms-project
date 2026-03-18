export interface IDashboardStats {
  readingStats: {
    totalBooksRead: number
    booksCurrentlyReading: number
    totalReadingTime: number
    averageRatingGiven: number
  }
  borrowStats: {
    activeBorrows: number
    overdueBorrows: number
    totalBorrowsAllTime: number
    returnedBorrows: number
  }
  reservationStats: {
    activeReservations: number
    claimableReservations: number
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
  coverImageUrl?: string
  ratingAverage: number
  ratingCount: number
}
