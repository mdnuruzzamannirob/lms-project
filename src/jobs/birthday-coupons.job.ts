import { UserModel } from '../modules/auth/auth.model'
import { CouponModel } from '../modules/promotions/model'

const sameMonthDay = (left: Date, right: Date): boolean => {
  return (
    left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
  )
}

const generateCode = (userId: string): string => {
  const suffix = userId.slice(-6).toUpperCase()
  const year = new Date().getFullYear()
  return `BDAY${year}${suffix}`
}

export const runBirthdayCouponJob = async (): Promise<{ created: number }> => {
  const today = new Date()
  const users = await UserModel.find({})
  let created = 0

  for (const user of users) {
    // The user model does not have dateOfBirth yet, so createdAt is used as the anniversary marker.
    if (!sameMonthDay(user.createdAt, today)) {
      continue
    }

    const code = generateCode(user._id.toString())
    const existing = await CouponModel.findOne({ code })

    if (existing) {
      continue
    }

    const startsAt = new Date(today)
    const endsAt = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    await CouponModel.create({
      code,
      title: 'Birthday Week Coupon',
      description: 'Special birthday week discount coupon.',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscountAmount: 300,
      minOrderAmount: 0,
      totalLimit: 1,
      applicablePlanIds: [],
      isActive: true,
      startsAt,
      endsAt,
    })

    created += 1
  }

  return { created }
}
