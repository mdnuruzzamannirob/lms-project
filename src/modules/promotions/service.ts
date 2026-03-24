import { ClientSession, Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import { PlanModel } from '../plans/model'
import type { DiscountResolution } from './interface'
import { CouponModel, CouponUsageModel, FlashSaleModel } from './model'
import {
  calculateCouponDiscount,
  formatCoupon,
  formatFlashSale,
  isWithinActiveWindow,
  now,
} from './utils'

const validateCoupon = async (payload: {
  code: string
  planId: string
  amount: number
  userId?: string
}) => {
  const coupon = await CouponModel.findOne({
    code: payload.code.toUpperCase(),
  })

  if (!coupon || !coupon.isActive) {
    throw new AppError('Coupon is invalid.', 400)
  }

  const at = now()

  if (!isWithinActiveWindow(coupon.startsAt, coupon.endsAt, at)) {
    throw new AppError('Coupon is not active right now.', 400)
  }

  if (payload.amount < coupon.minOrderAmount) {
    throw new AppError('Order amount is below coupon minimum.', 400)
  }

  if (
    typeof coupon.totalLimit === 'number' &&
    coupon.usedCount >= coupon.totalLimit
  ) {
    throw new AppError('Coupon usage limit reached.', 400)
  }

  if (
    coupon.applicablePlanIds.length > 0 &&
    !coupon.applicablePlanIds.some(
      (planId) => planId.toString() === payload.planId,
    )
  ) {
    throw new AppError('Coupon is not applicable for this plan.', 400)
  }

  const discountAmount = calculateCouponDiscount(payload.amount, {
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscountAmount: coupon.maxDiscountAmount,
  })

  return {
    valid: true,
    coupon: formatCoupon(coupon),
    discountAmount,
    payableAmount: Number((payload.amount - discountAmount).toFixed(2)),
  }
}

const resolvePaymentDiscount = async (payload: {
  planId: string
  amount: number
  couponCode?: string
  userId?: string
}): Promise<DiscountResolution> => {
  const plan = await PlanModel.findById(payload.planId)

  if (!plan || !plan.isActive) {
    throw new AppError('Plan not found or inactive.', 404)
  }

  const at = now()
  let couponAmount = 0
  let flashSaleAmount = 0
  let couponId: string | undefined
  let couponCode: string | undefined

  if (payload.couponCode) {
    const couponValidation = await promotionsService.validateCoupon({
      code: payload.couponCode,
      planId: payload.planId,
      amount: payload.amount,
      ...(payload.userId ? { userId: payload.userId } : {}),
    })

    couponAmount = couponValidation.discountAmount
    couponId = couponValidation.coupon.id
    couponCode = couponValidation.coupon.code
  }

  const activeFlashSale = await FlashSaleModel.findOne({
    isActive: true,
    startsAt: { $lte: at },
    endsAt: { $gte: at },
    $or: [
      { applicablePlanIds: { $size: 0 } },
      { applicablePlanIds: new Types.ObjectId(payload.planId) },
    ],
  }).sort({ discountPercentage: -1 })

  if (activeFlashSale) {
    const discountBase = Math.max(0, payload.amount - couponAmount)
    flashSaleAmount = Number(
      ((discountBase * activeFlashSale.discountPercentage) / 100).toFixed(2),
    )
  }

  const totalDiscount = Number((couponAmount + flashSaleAmount).toFixed(2))

  return {
    ...(couponId ? { couponId } : {}),
    ...(couponCode ? { couponCode } : {}),
    ...(activeFlashSale ? { flashSaleId: activeFlashSale._id.toString() } : {}),
    discountAmount: totalDiscount,
    discountBreakdown: {
      couponAmount,
      flashSaleAmount,
    },
  }
}

const markCouponUsed = async (
  payload: {
    couponId: string
    userId: string
    paymentId: string
    amount: number
  },
  session?: ClientSession,
): Promise<void> => {
  const coupon = await CouponModel.findById(payload.couponId).session(
    session ?? null,
  )

  if (!coupon) {
    throw new AppError('Coupon not found while tracking usage.', 404)
  }

  coupon.usedCount += 1
  await coupon.save(session ? { session } : undefined)

  await CouponUsageModel.create(
    [
      {
        couponId: coupon._id,
        userId: new Types.ObjectId(payload.userId),
        paymentId: new Types.ObjectId(payload.paymentId),
        amount: payload.amount,
        usedAt: new Date(),
      },
    ],
    { session },
  )
}

const listCoupons = async () => {
  const coupons = await CouponModel.find({}).sort({ createdAt: -1 })
  return coupons.map((coupon) => formatCoupon(coupon))
}

const getCouponById = async (id: string) => {
  const coupon = await CouponModel.findById(id)
  return formatCoupon(coupon)
}

const createCoupon = async (payload: {
  code: string
  title: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxDiscountAmount?: number
  minOrderAmount: number
  totalLimit?: number
  applicablePlanIds: string[]
  isActive: boolean
  startsAt: Date
  endsAt: Date
}) => {
  if (payload.endsAt.getTime() <= payload.startsAt.getTime()) {
    throw new AppError('Coupon end date must be later than start date.', 400)
  }

  const existing = await CouponModel.findOne({
    code: payload.code.toUpperCase(),
  })

  if (existing) {
    throw new AppError('Coupon code already exists.', 409)
  }

  const coupon = await CouponModel.create({
    ...payload,
    code: payload.code.toUpperCase(),
    applicablePlanIds: payload.applicablePlanIds.map(
      (id) => new Types.ObjectId(id),
    ),
  })

  return formatCoupon(coupon)
}

const updateCoupon = async (
  id: string,
  payload: Partial<{
    title: string
    description: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    maxDiscountAmount: number
    minOrderAmount: number
    totalLimit: number
    applicablePlanIds: string[]
    startsAt: Date
    endsAt: Date
  }>,
) => {
  const coupon = await CouponModel.findById(id)

  if (!coupon) {
    throw new AppError('Coupon not found.', 404)
  }

  if (payload.startsAt && payload.endsAt) {
    if (payload.endsAt.getTime() <= payload.startsAt.getTime()) {
      throw new AppError('Coupon end date must be later than start date.', 400)
    }
  }

  if (typeof payload.title === 'string') coupon.title = payload.title
  if (typeof payload.description === 'string')
    coupon.description = payload.description
  if (typeof payload.discountType === 'string')
    coupon.discountType = payload.discountType
  if (typeof payload.discountValue === 'number')
    coupon.discountValue = payload.discountValue
  if (typeof payload.maxDiscountAmount === 'number') {
    coupon.maxDiscountAmount = payload.maxDiscountAmount
  }
  if (typeof payload.minOrderAmount === 'number') {
    coupon.minOrderAmount = payload.minOrderAmount
  }
  if (typeof payload.totalLimit === 'number')
    coupon.totalLimit = payload.totalLimit
  if (payload.startsAt instanceof Date) coupon.startsAt = payload.startsAt
  if (payload.endsAt instanceof Date) coupon.endsAt = payload.endsAt
  if (Array.isArray(payload.applicablePlanIds)) {
    coupon.applicablePlanIds = payload.applicablePlanIds.map(
      (planId) => new Types.ObjectId(planId),
    )
  }

  await coupon.save()
  return formatCoupon(coupon)
}

const toggleCoupon = async (id: string) => {
  const coupon = await CouponModel.findById(id)

  if (!coupon) {
    throw new AppError('Coupon not found.', 404)
  }

  coupon.isActive = !coupon.isActive
  await coupon.save()

  return formatCoupon(coupon)
}

const deleteCoupon = async (id: string) => {
  const coupon = await CouponModel.findById(id)

  if (!coupon) {
    throw new AppError('Coupon not found.', 404)
  }

  await coupon.deleteOne()
}

const listFlashSales = async () => {
  const flashSales = await FlashSaleModel.find({}).sort({ createdAt: -1 })
  return flashSales.map((flashSale) => formatFlashSale(flashSale))
}

const getActiveFlashSales = async () => {
  const at = now()
  const flashSales = await FlashSaleModel.find({
    isActive: true,
    startsAt: { $lte: at },
    endsAt: { $gte: at },
  }).sort({ discountPercentage: -1 })

  return flashSales.map((flashSale) => formatFlashSale(flashSale))
}

const createFlashSale = async (payload: {
  title: string
  description: string
  discountPercentage: number
  applicablePlanIds: string[]
  isActive: boolean
  startsAt: Date
  endsAt: Date
}) => {
  if (payload.endsAt.getTime() <= payload.startsAt.getTime()) {
    throw new AppError(
      'Flash sale end date must be later than start date.',
      400,
    )
  }

  const flashSale = await FlashSaleModel.create({
    ...payload,
    applicablePlanIds: payload.applicablePlanIds.map(
      (id) => new Types.ObjectId(id),
    ),
  })

  return formatFlashSale(flashSale)
}

const updateFlashSale = async (
  id: string,
  payload: Partial<{
    title: string
    description: string
    discountPercentage: number
    applicablePlanIds: string[]
    startsAt: Date
    endsAt: Date
  }>,
) => {
  const flashSale = await FlashSaleModel.findById(id)

  if (!flashSale) {
    throw new AppError('Flash sale not found.', 404)
  }

  if (payload.startsAt && payload.endsAt) {
    if (payload.endsAt.getTime() <= payload.startsAt.getTime()) {
      throw new AppError(
        'Flash sale end date must be later than start date.',
        400,
      )
    }
  }

  if (typeof payload.title === 'string') flashSale.title = payload.title
  if (typeof payload.description === 'string') {
    flashSale.description = payload.description
  }
  if (typeof payload.discountPercentage === 'number') {
    flashSale.discountPercentage = payload.discountPercentage
  }
  if (payload.startsAt instanceof Date) flashSale.startsAt = payload.startsAt
  if (payload.endsAt instanceof Date) flashSale.endsAt = payload.endsAt
  if (Array.isArray(payload.applicablePlanIds)) {
    flashSale.applicablePlanIds = payload.applicablePlanIds.map(
      (planId) => new Types.ObjectId(planId),
    )
  }

  await flashSale.save()
  return formatFlashSale(flashSale)
}

const toggleFlashSale = async (id: string) => {
  const flashSale = await FlashSaleModel.findById(id)

  if (!flashSale) {
    throw new AppError('Flash sale not found.', 404)
  }

  flashSale.isActive = !flashSale.isActive
  await flashSale.save()

  return formatFlashSale(flashSale)
}

const deleteFlashSale = async (id: string) => {
  const flashSale = await FlashSaleModel.findById(id)

  if (!flashSale) {
    throw new AppError('Flash sale not found.', 404)
  }

  await flashSale.deleteOne()
}

export const promotionsService = {
  validateCoupon,
  resolvePaymentDiscount,
  markCouponUsed,
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
  listFlashSales,
  getActiveFlashSales,
  createFlashSale,
  updateFlashSale,
  toggleFlashSale,
  deleteFlashSale,
}
