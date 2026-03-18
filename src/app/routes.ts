import { Router } from 'express'

import { authRouter } from '../modules/auth'
import { authorsRouter } from '../modules/authors'
import { booksRouter } from '../modules/books'
import { categoriesRouter } from '../modules/categories'
import { healthRouter } from '../modules/health'
import { onboardingRouter } from '../modules/onboarding'
import { paymentsRouter } from '../modules/payments'
import { plansRouter } from '../modules/plans'
import { promotionsRouter } from '../modules/promotions'
import { rbacRouter } from '../modules/rbac'
import { staffRouter } from '../modules/staff'
import { staffAuthRouter } from '../modules/staff-auth'
import { subscriptionsRouter } from '../modules/subscriptions'

const router = Router()

router.use('/auth', authRouter)
router.use('/staff', staffAuthRouter)
router.use('/onboarding', onboardingRouter)
router.use('/authors', authorsRouter)
router.use('/categories', categoriesRouter)
router.use('/plans', plansRouter)
router.use('/subscriptions', subscriptionsRouter)
router.use('/', booksRouter)
router.use('/', paymentsRouter)
router.use('/', promotionsRouter)
router.use('/admin', rbacRouter)
router.use('/admin/staff', staffRouter)
router.use('/health', healthRouter)

export const appRouter = router
