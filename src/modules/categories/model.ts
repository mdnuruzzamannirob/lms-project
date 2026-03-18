import { model, Schema, type Model } from 'mongoose'

import type { ICategory } from './interface'

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: false,
      default: undefined,
      index: true,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
      index: true,
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

categorySchema.index({ parentId: 1, sortOrder: 1, name: 1 })
categorySchema.index({ name: 'text', description: 'text' })

export const CategoryModel: Model<ICategory> = model<ICategory>(
  'Category',
  categorySchema,
)
