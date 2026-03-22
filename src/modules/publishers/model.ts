import { model, Schema, type Model } from 'mongoose'
import type { IPublisher } from './interface'

const publisherSchema = new Schema<IPublisher>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    website: { type: String, required: false, trim: true, default: undefined },
    logo: {
      type: new Schema(
        {
          publicId: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
        },
        { _id: false },
      ),
      required: false,
      default: undefined,
    },
    country: { type: String, required: false, trim: true, default: undefined },
    foundedYear: { type: Number, required: false, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
)

publisherSchema.index({ name: 'text' })
publisherSchema.index({ isActive: 1, name: 1 })

export const PublisherModel: Model<IPublisher> = model<IPublisher>(
  'Publisher',
  publisherSchema,
)
