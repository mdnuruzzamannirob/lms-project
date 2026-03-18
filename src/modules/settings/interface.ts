import type { Types } from 'mongoose'

export interface IGlobalSettings {
  _id: Types.ObjectId
  singletonKey: 'global'
  providers: {
    email: {
      provider: 'console' | 'resend'
      from: string
      enabled: boolean
    }
    sms: {
      provider: 'console' | 'twilio'
      from: string | undefined
      enabled: boolean
    }
    push: {
      provider: 'console' | 'fcm'
      enabled: boolean
    }
    storage: {
      provider: 'local' | 'cloudinary'
      enabled: boolean
      basePath: string
    }
    payment: {
      provider: 'sslcommerz' | 'stripe' | 'paypal'
      enabled: boolean
      currency: string
    }
  }
  templates: {
    email: Record<string, string>
    sms: Record<string, string>
    push: Record<string, string>
  }
  maintenance: {
    enabled: boolean
    message: string
    startsAt: Date | undefined
    endsAt: Date | undefined
    allowedIps: string[]
  }
  trial: {
    enabled: boolean
    durationDays: number
    maxBorrows: number
    autoActivate: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export type SettingsUpdatePayload = Partial<{
  providers: Partial<IGlobalSettings['providers']>
  templates: Partial<IGlobalSettings['templates']>
  maintenance: Partial<IGlobalSettings['maintenance']>
  trial: Partial<IGlobalSettings['trial']>
}>
