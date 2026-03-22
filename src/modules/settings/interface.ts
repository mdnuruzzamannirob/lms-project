import type { Types } from 'mongoose'

export interface IGlobalSettings {
  _id: Types.ObjectId
  singletonKey: 'global'
  providers: {
    email: {
      from: string
      enabled: boolean
    }
    push: {
      enabled: boolean
    }
    storage: {
      enabled: boolean
      basePath: string
    }
    payment: {
      enabled: boolean
      currency: string
    }
  }
  templates: {
    email: Record<string, string>
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
    accessLevel: 'free' | 'basic'
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
