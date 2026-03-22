import { model, Schema, type Model } from 'mongoose'

import type { IAuthor } from './interface'

const authorSchema = new Schema<IAuthor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    countryCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 3,
      default: undefined,
      index: true,
    },
    avatar: {
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
    website: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

authorSchema.index({ name: 'text', bio: 'text' })
authorSchema.index({ isActive: 1, name: 1 })

export const AuthorModel: Model<IAuthor> = model<IAuthor>(
  'Author',
  authorSchema,
)
