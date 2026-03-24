import { AppError } from '../../common/errors/AppError'
import { PlanModel } from './model'
import { formatPlan } from './utils'

const listPlans = async (includeInactive = false) => {
  const filter = includeInactive ? {} : { isActive: true }
  const plans = await PlanModel.find(filter).sort({
    sortOrder: 1,
    createdAt: 1,
  })

  return plans.map((plan) => formatPlan(plan))
}

const getPlanById = async (id: string) => {
  const plan = await PlanModel.findById(id)
  return formatPlan(plan)
}

const getPlanByCode = async (code: string) => {
  const plan = await PlanModel.findOne({
    code: code.toUpperCase(),
    isActive: true,
  })

  if (!plan) {
    throw new AppError('Plan not found.', 404)
  }

  return formatPlan(plan)
}

const createPlan = async (payload: {
  code: string
  name: string
  description: string
  price: number
  currency: string
  durationDays: number
  maxDevices: number
  downloadEnabled: boolean
  accessLevel: 'free' | 'basic' | 'premium'
  features: string[]
  isFree: boolean
  isActive: boolean
  sortOrder: number
}) => {
  const existing = await PlanModel.findOne({ code: payload.code })

  if (existing) {
    throw new AppError('Plan with this code already exists.', 409)
  }

  const plan = await PlanModel.create({
    ...payload,
    code: payload.code.toUpperCase(),
    currency: payload.currency.toUpperCase(),
    isFree: payload.isFree || payload.price === 0,
  })

  return formatPlan(plan)
}

const updatePlan = async (
  id: string,
  payload: Partial<{
    code: string
    name: string
    description: string
    price: number
    currency: string
    durationDays: number
    maxDevices: number
    downloadEnabled: boolean
    accessLevel: 'free' | 'basic' | 'premium'
    features: string[]
    isFree: boolean
    isActive: boolean
    sortOrder: number
  }>,
) => {
  const plan = await PlanModel.findById(id)

  if (!plan) {
    throw new AppError('Plan not found.', 404)
  }

  if (typeof payload.code === 'string') {
    plan.code = payload.code.toUpperCase()
  }

  if (typeof payload.name === 'string') {
    plan.name = payload.name
  }

  if (typeof payload.description === 'string') {
    plan.description = payload.description
  }

  if (typeof payload.price === 'number') {
    plan.price = payload.price
  }

  if (typeof payload.currency === 'string') {
    plan.currency = payload.currency.toUpperCase()
  }

  if (typeof payload.durationDays === 'number') {
    plan.durationDays = payload.durationDays
  }

  if (typeof payload.maxDevices === 'number') {
    plan.maxDevices = payload.maxDevices
  }

  if (typeof payload.downloadEnabled === 'boolean') {
    plan.downloadEnabled = payload.downloadEnabled
  }

  if (typeof payload.accessLevel === 'string') {
    plan.accessLevel = payload.accessLevel
  }

  if (Array.isArray(payload.features)) {
    plan.features = payload.features
  }

  if (typeof payload.isFree === 'boolean') {
    plan.isFree = payload.isFree
  }

  if (typeof payload.isActive === 'boolean') {
    plan.isActive = payload.isActive
  }

  if (typeof payload.sortOrder === 'number') {
    plan.sortOrder = payload.sortOrder
  }

  if (plan.price === 0) {
    plan.isFree = true
  }

  await plan.save()

  return formatPlan(plan)
}

const togglePlan = async (id: string) => {
  const plan = await PlanModel.findById(id)

  if (!plan) {
    throw new AppError('Plan not found.', 404)
  }

  plan.isActive = !plan.isActive
  await plan.save()

  return formatPlan(plan)
}

export const plansService = {
  listPlans,
  getPlanById,
  getPlanByCode,
  createPlan,
  updatePlan,
  togglePlan,
}
