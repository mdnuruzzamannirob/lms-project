import { Types } from 'mongoose'

import { AuditLogModel } from '../../src/modules/audit/model'
import { UserModel } from '../../src/modules/auth/model'
import { AuthorModel } from '../../src/modules/authors/model'
import { BookModel } from '../../src/modules/books/model'
import { BorrowModel } from '../../src/modules/borrows/model'
import { CategoryModel } from '../../src/modules/categories/model'
import { NotificationType } from '../../src/modules/notifications/interface'
import { NotificationModel } from '../../src/modules/notifications/model'
import { OnboardingModel } from '../../src/modules/onboarding/model'
import { PaymentModel } from '../../src/modules/payments/model'
import { PlanModel } from '../../src/modules/plans/model'
import { CouponModel, FlashSaleModel } from '../../src/modules/promotions/model'
import { PermissionModel, RoleModel } from '../../src/modules/rbac/model'
import { ReadingProgressModel } from '../../src/modules/reading/model'
import { ReportJobModel } from '../../src/modules/reports/model'
import { ReservationModel } from '../../src/modules/reservations/model'
import { ReviewModel } from '../../src/modules/reviews/model'
import { SearchLogModel } from '../../src/modules/search/model'
import { SettingsModel } from '../../src/modules/settings/model'
import { StaffModel } from '../../src/modules/staff/model'
import { SubscriptionModel } from '../../src/modules/subscriptions/model'
import { WishlistModel } from '../../src/modules/wishlist/model'

const random = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export const createUser = async () => {
  return UserModel.create({
    name: random('user'),
    email: `${random('user')}@mail.test`,
    provider: 'local',
    isEmailVerified: true,
    passwordHash: 'scrypt:test',
  })
}

export const createRole = async () => {
  return RoleModel.create({
    name: random('role'),
    description: 'Test role',
    permissions: ['plans.view'],
    isSystem: false,
  })
}

export const createPermission = async () => {
  return PermissionModel.create({
    key: random('permission'),
    name: 'Test Permission',
    description: 'Permission for tests',
    module: 'test',
  })
}

export const createStaff = async () => {
  const role = await createRole()
  return StaffModel.create({
    name: random('staff'),
    email: `${random('staff')}@mail.test`,
    passwordHash: 'scrypt:test',
    roleId: role._id,
    isSuperAdmin: true,
    isActive: true,
  })
}

export const createPlan = async (
  overrides?: Partial<{ isFree: boolean; maxBorrows: number; price: number }>,
) => {
  return PlanModel.create({
    code: random('PLAN').toUpperCase(),
    name: 'Test Plan',
    description: 'Plan for tests',
    price: overrides?.price ?? 100,
    currency: 'BDT',
    durationDays: 30,
    maxBorrows: overrides?.maxBorrows ?? 3,
    features: ['feature-a'],
    isFree: overrides?.isFree ?? false,
    isActive: true,
    sortOrder: 1,
  })
}

export const createSubscription = async (payload?: {
  userId?: Types.ObjectId
  planId?: Types.ObjectId
  status?:
    | 'pending'
    | 'active'
    | 'cancelled'
    | 'expired'
    | 'upgraded'
    | 'downgraded'
}) => {
  const user = payload?.userId ? null : await createUser()
  const plan = payload?.planId ? null : await createPlan()
  const now = new Date()

  return SubscriptionModel.create({
    userId: payload?.userId ?? user!._id,
    planId: payload?.planId ?? plan!._id,
    status: payload?.status ?? 'active',
    startedAt: now,
    endsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    autoRenew: true,
  })
}

export const createAuthor = async () => {
  return AuthorModel.create({
    name: random('Author'),
    bio: 'Author bio',
    isActive: true,
  })
}

export const createCategory = async () => {
  return CategoryModel.create({
    name: random('Category'),
    slug: random('category').toLowerCase(),
    description: 'Category description',
    isActive: true,
  })
}

export const createBook = async () => {
  const author = await createAuthor()
  const category = await createCategory()
  const staff = await createStaff()

  return BookModel.create({
    title: random('Book'),
    slug: random('book').toLowerCase(),
    summary: 'Book summary',
    language: 'en',
    featured: false,
    isAvailable: true,
    authorIds: [author._id],
    categoryIds: [category._id],
    tags: ['test'],
    files: [],
    ratingAverage: 0,
    ratingCount: 0,
    addedBy: staff._id,
  })
}

export const createReadingProgress = async () => {
  const user = await createUser()
  const book = await createBook()

  return ReadingProgressModel.create({
    userId: user._id,
    bookId: book._id,
    progressPercentage: 10,
    status: 'currently-reading',
    startedAt: new Date(),
    lastReadAt: new Date(),
  })
}

export const createBorrow = async () => {
  const user = await createUser()
  const plan = await createPlan()
  const book = await createBook()

  return BorrowModel.create({
    userId: user._id,
    bookId: book._id,
    planId: plan._id,
    status: 'borrowed',
    borrowedAt: new Date(),
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  })
}

export const createReservation = async () => {
  const user = await createUser()
  const book = await createBook()

  return ReservationModel.create({
    userId: user._id,
    bookId: book._id,
    status: 'queued',
    queuePosition: 1,
  })
}

export const createWishlist = async () => {
  const user = await createUser()
  const book = await createBook()

  return WishlistModel.create({
    userId: user._id,
    bookId: book._id,
  })
}

export const createReview = async () => {
  const user = await createUser()
  const book = await createBook()

  return ReviewModel.create({
    userId: user._id,
    bookId: book._id,
    rating: 4,
    title: 'Nice',
    comment: 'Great read',
    isVisible: true,
  })
}

export const createNotification = async () => {
  const user = await createUser()

  return NotificationModel.create({
    userId: user._id,
    type: NotificationType.SYSTEM_MESSAGE,
    title: 'Test Notification',
    body: 'Notification body',
    read: false,
    deliveredAt: new Date(),
  })
}

export const createSearchLog = async () => {
  const user = await createUser()
  const book = await createBook()

  return SearchLogModel.create({
    userId: user._id,
    query: 'test search',
    clickedBookId: book._id,
    timestamp: new Date(),
  })
}

export const createPayment = async () => {
  const user = await createUser()
  const plan = await createPlan()
  const subscription = await createSubscription({
    userId: user._id,
    planId: plan._id,
    status: 'pending',
  })

  return PaymentModel.create({
    userId: user._id,
    subscriptionId: subscription._id,
    provider: 'sslcommerz',
    gateway: 'bkash',
    status: 'pending',
    amount: 100,
    currency: 'BDT',
    discountAmount: 0,
    payableAmount: 100,
    reference: random('PAYREF').toUpperCase(),
    metadata: {},
  })
}

export const createCoupon = async () => {
  return CouponModel.create({
    code: random('CPN').toUpperCase(),
    title: 'Coupon',
    description: 'Coupon desc',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    isActive: true,
    startsAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    applicablePlanIds: [],
  })
}

export const createFlashSale = async () => {
  return FlashSaleModel.create({
    title: 'Flash Sale',
    description: 'Flash Sale desc',
    discountPercentage: 10,
    startsAt: new Date(Date.now() - 1000),
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    isActive: true,
    applicablePlanIds: [],
  })
}

export const createOnboarding = async () => {
  const user = await createUser()
  return OnboardingModel.create({
    userId: user._id,
    status: 'pending',
  })
}

export const createAuditLog = async () => {
  const staff = await createStaff()
  return AuditLogModel.create({
    actorType: 'admin',
    actorId: staff._id,
    actorEmail: staff.email,
    action: 'test.action',
    module: 'test',
    description: 'Audit log entry',
    meta: {},
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
}

export const createReportJob = async () => {
  const staff = await createStaff()
  return ReportJobModel.create({
    requestedByStaffId: staff._id,
    type: 'admin_overview',
    format: 'json',
    filters: {},
    status: 'queued',
    attempts: 0,
  })
}

export const createSettings = async () => {
  return SettingsModel.create({
    singletonKey: 'global',
    providers: {
      email: { provider: 'console', from: 'noreply@test.local', enabled: true },
      sms: { provider: 'console', enabled: false },
      push: { provider: 'console', enabled: true },
      storage: { provider: 'local', enabled: true, basePath: 'uploads' },
      payment: { provider: 'sslcommerz', enabled: true, currency: 'BDT' },
    },
    templates: {
      email: {},
      sms: {},
      push: {},
    },
    maintenance: {
      enabled: false,
      message: 'Maintenance',
      allowedIps: [],
    },
    trial: {
      enabled: true,
      durationDays: 7,
      maxBorrows: 2,
      autoActivate: true,
    },
  })
}
