import { AppError } from '../../common/errors/AppError'
import { ICoupon, IFlashSale } from './interface'

export const now = () => new Date()

export const isWithinActiveWindow = (
  startAt: Date,
  endAt: Date,
  at: Date,
): boolean => {
  return startAt.getTime() <= at.getTime() && at.getTime() <= endAt.getTime()
}

export const formatCoupon = (coupon: ICoupon | null) => {
  if (!coupon) {
    throw new AppError('Coupon not found.', 404)
  }

  return {
    id: coupon._id.toString(),
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscountAmount: coupon.maxDiscountAmount,
    minOrderAmount: coupon.minOrderAmount,
    totalLimit: coupon.totalLimit,
    usedCount: coupon.usedCount,
    applicablePlanIds: coupon.applicablePlanIds.map((planId) =>
      planId.toString(),
    ),
    isActive: coupon.isActive,
    startsAt: coupon.startsAt.toISOString(),
    endsAt: coupon.endsAt.toISOString(),
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  }
}

export const formatFlashSale = (flashSale: IFlashSale | null) => {
  if (!flashSale) {
    throw new AppError('Flash sale not found.', 404)
  }

  return {
    id: flashSale._id.toString(),
    title: flashSale.title,
    description: flashSale.description,
    discountPercentage: flashSale.discountPercentage,
    applicablePlanIds: flashSale.applicablePlanIds.map((planId) =>
      planId.toString(),
    ),
    isActive: flashSale.isActive,
    startsAt: flashSale.startsAt.toISOString(),
    endsAt: flashSale.endsAt.toISOString(),
    createdAt: flashSale.createdAt.toISOString(),
    updatedAt: flashSale.updatedAt.toISOString(),
  }
}

export const calculateCouponDiscount = (
  amount: number,
  coupon: {
    discountType: 'percentage' | 'fixed'
    discountValue: number
    maxDiscountAmount: number | undefined
  },
): number => {
  const discount =
    coupon.discountType === 'percentage'
      ? (amount * coupon.discountValue) / 100
      : coupon.discountValue

  const capped =
    typeof coupon.maxDiscountAmount === 'number'
      ? Math.min(discount, coupon.maxDiscountAmount)
      : discount

  return Number(Math.max(0, capped).toFixed(2))
}
