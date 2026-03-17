import { Router } from 'express'

import { authRouter } from '../modules/auth'
import { healthRouter } from '../modules/health'
import { onboardingRouter } from '../modules/onboarding'
import { rbacRouter } from '../modules/rbac'
import { staffRouter } from '../modules/staff'
import { staffAuthRouter } from '../modules/staff-auth'

const router = Router()

router.use('/auth', authRouter)
router.use('/staff', staffAuthRouter)
router.use('/onboarding', onboardingRouter)
router.use('/admin', rbacRouter)
router.use('/admin/staff', staffRouter)
router.use('/health', healthRouter)

export const appRouter = router
