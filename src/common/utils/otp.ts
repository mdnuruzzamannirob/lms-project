import crypto from 'node:crypto'

import {
  EmailOtpModel,
  type EmailOtpActorType,
  type EmailOtpPurpose,
} from '../../modules/auth'

const OTP_LENGTH = 6

export const generateOtp = (): string => {
  const max = 10 ** OTP_LENGTH
  const value = crypto.randomInt(0, max)
  return value.toString().padStart(OTP_LENGTH, '0')
}

export const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export const createEmailOtp = async (
  actorId: string,
  actorType: EmailOtpActorType,
  purpose: EmailOtpPurpose,
): Promise<string> => {
  await EmailOtpModel.deleteMany({
    actorId,
    actorType,
    purpose,
    usedAt: null,
  })

  const otp = generateOtp()
  const otpHash = hashOtp(otp)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await EmailOtpModel.create({
    actorId,
    actorType,
    otpHash,
    purpose,
    expiresAt,
  })

  return otp
}

export const verifyEmailOtp = async (
  actorId: string,
  actorType: EmailOtpActorType,
  purpose: EmailOtpPurpose,
  otp: string,
): Promise<boolean> => {
  const otpDoc = await EmailOtpModel.findOne({
    actorId,
    actorType,
    purpose,
    usedAt: null,
  }).sort({ createdAt: -1 })

  if (!otpDoc || otpDoc.expiresAt.getTime() < Date.now()) {
    return false
  }

  if (otpDoc.otpHash !== hashOtp(otp)) {
    return false
  }

  otpDoc.usedAt = new Date()
  await otpDoc.save()
  return true
}
