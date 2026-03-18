import { Router } from 'express'

import { authRouter } from '../modules/auth'
import { authorsRouter } from '../modules/authors'
import { booksRouter } from '../modules/books'
import { borrowsRouter } from '../modules/borrows'
import { categoriesRouter } from '../modules/categories'
import { dashboardRouter } from '../modules/dashboard'
import { healthRouter } from '../modules/health'
import { membersRouter } from '../modules/members'
import { notificationsRouter } from '../modules/notifications'
import { onboardingRouter } from '../modules/onboarding'
import { paymentsRouter } from '../modules/payments'
import { plansRouter } from '../modules/plans'
import { promotionsRouter } from '../modules/promotions'
import { rbacRouter } from '../modules/rbac'
import { readingRouter } from '../modules/reading'
import { reservationsRouter } from '../modules/reservations'
import { reviewsRouter } from '../modules/reviews'
import { searchRouter } from '../modules/search'
import { staffRouter } from '../modules/staff'
import { staffAuthRouter } from '../modules/staff-auth'
import { subscriptionsRouter } from '../modules/subscriptions'
import { wishlistRouter } from '../modules/wishlist'

const router = Router()

router.use('/auth', authRouter)
router.use('/staff', staffAuthRouter)
router.use('/onboarding', onboardingRouter)
router.use('/authors', authorsRouter)
router.use('/categories', categoriesRouter)
router.use('/plans', plansRouter)
router.use('/subscriptions', subscriptionsRouter)
router.use('/', booksRouter)
router.use('/', readingRouter)
router.use('/', borrowsRouter)
router.use('/', reservationsRouter)
router.use('/', wishlistRouter)
router.use('/', reviewsRouter)
router.use('/', paymentsRouter)
router.use('/', promotionsRouter)
router.use('/search', searchRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)
router.use('/admin', rbacRouter)
router.use('/admin/staff', staffRouter)
router.use('/admin/members', membersRouter)
router.use('/health', healthRouter)

export const appRouter = router
