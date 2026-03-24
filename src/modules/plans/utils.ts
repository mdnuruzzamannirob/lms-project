import { AppError } from '../../common/errors/AppError'
import { IPlan } from './interface'

export const formatPlan = (plan: IPlan | null) => {
  if (!plan) {
    throw new AppError('Plan not found.', 404)
  }

  return {
    id: plan._id.toString(),
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    durationDays: plan.durationDays,
    maxDevices: plan.maxDevices,
    downloadEnabled: plan.downloadEnabled,
    accessLevel: plan.accessLevel,
    features: plan.features,
    isFree: plan.isFree,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}
