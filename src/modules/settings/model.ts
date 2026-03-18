import { model, Schema, type Model } from 'mongoose'

import type { IGlobalSettings } from './interface'

const settingsSchema = new Schema<IGlobalSettings>(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
      index: true,
    },
    providers: {
      email: {
        from: {
          type: String,
          required: true,
          default: 'noreply@example.com',
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      push: {
        enabled: {
          type: Boolean,
          default: true,
        },
      },
      storage: {
        enabled: {
          type: Boolean,
          default: true,
        },
        basePath: {
          type: String,
          required: true,
          default: 'uploads',
        },
      },
      payment: {
        enabled: {
          type: Boolean,
          default: true,
        },
        currency: {
          type: String,
          required: true,
          default: 'BDT',
        },
      },
    },
    templates: {
      email: {
        type: Schema.Types.Mixed,
        default: {},
      },
      push: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    maintenance: {
      enabled: {
        type: Boolean,
        default: false,
        index: true,
      },
      message: {
        type: String,
        default: 'System is currently under maintenance.',
      },
      startsAt: {
        type: Date,
        required: false,
        default: undefined,
      },
      endsAt: {
        type: Date,
        required: false,
        default: undefined,
      },
      allowedIps: {
        type: [String],
        default: [],
      },
    },
    trial: {
      enabled: {
        type: Boolean,
        default: true,
      },
      durationDays: {
        type: Number,
        default: 7,
        min: 1,
      },
      maxBorrows: {
        type: Number,
        default: 2,
        min: 1,
      },
      autoActivate: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

export const SettingsModel: Model<IGlobalSettings> = model<IGlobalSettings>(
  'Settings',
  settingsSchema,
)
