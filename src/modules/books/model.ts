import { model, Schema, type Model } from 'mongoose'

import type { IBook, IBookFile } from './interface'

const bookFileSchema = new Schema<IBookFile>(
  {
    provider: { type: String, enum: ['cloudinary'], required: true },
    publicId: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    format: { type: String, enum: ['pdf', 'epub', 'mobi'], required: true },
    size: { type: Number, required: true, min: 1 },
    originalFileName: { type: String, required: true, trim: true },
    resourceType: {
      type: String,
      enum: ['raw'],
      required: true,
      default: 'raw',
    },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  {
    _id: true,
    id: false,
  },
)

const bookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
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
    isbn: {
      type: String,
      required: false,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: 'en',
      index: true,
    },
    pageCount: {
      type: Number,
      required: false,
      min: 1,
      default: undefined,
    },
    publicationDate: {
      type: Date,
      required: false,
      default: undefined,
    },
    coverImage: {
      type: new Schema(
        {
          publicId: { type: String, required: true, trim: true },
          url: { type: String, required: true, trim: true },
          width: { type: Number, required: true },
          height: { type: Number, required: true },
        },
        { _id: false },
      ),
      required: false,
      default: undefined,
    },
    edition: {
      type: String,
      required: false,
      trim: true,
      default: undefined,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    authorIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Author',
        required: true,
        index: true,
      },
    ],
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true,
      },
    ],
    publisherId: {
      type: Schema.Types.ObjectId,
      ref: 'Publisher',
      required: false,
      default: undefined,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    files: {
      type: [bookFileSchema],
      default: [],
    },
    accessLevel: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      required: true,
      default: 'free',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    ratingAverage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

bookSchema.index({
  title: 'text',
  summary: 'text',
  description: 'text',
  isbn: 'text',
  tags: 'text',
})
bookSchema.index({ isAvailable: 1, featured: 1, createdAt: -1 })
bookSchema.index({ authorIds: 1 })
bookSchema.index({ categoryIds: 1 })

export const BookModel: Model<IBook> = model<IBook>('Book', bookSchema)
